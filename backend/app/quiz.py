import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from groq import Groq
from pydantic import BaseModel

from .documents import get_user_id
from .supabase_client import get_admin_client

router = APIRouter()

GROQ_MODEL = "openai/gpt-oss-120b"
MAX_CONTEXT_CHARS = 12000

QUIZ_PROMPT = """You are an expert tutor creating a diagnostic quiz from a student's own study material.

Read the material below and:
1. Identify 3 to 6 distinct concepts covered in it (specific, not generic — e.g. "The Bohr Effect", not "Biology").
2. For each concept, write exactly one multiple-choice question with 4 answer options that tests understanding of that concept, using only information from the material.

Respond with ONLY valid JSON in this exact shape, no other text:
{
  "concepts": [
    {
      "name": "Concept name",
      "question": "Question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_index": 0
    }
  ]
}

Study material:
---
%s
---
"""

PRACTICE_PROMPT = """You are an expert tutor creating targeted practice questions for a student.

Below is the student's study material, followed by a list of concepts they are currently weak on. For EACH concept listed, write exactly one NEW multiple-choice question (a different angle or scenario than a basic recall question) with 4 answer options that tests that concept, using only information from the material.

Concepts to target: %s

Respond with ONLY valid JSON in this exact shape, no other text:
{
  "questions": [
    {
      "concept_name": "must exactly match one of the target concept names",
      "question": "Question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_index": 0
    }
  ]
}

Study material:
---
%s
---
"""


def get_groq_client() -> Groq:
    return Groq(api_key=os.environ["GROQ_API_KEY"])


def _get_owned_document(admin, document_id: str, user_id: str) -> dict:
    result = (
        admin.table("documents")
        .select("*")
        .eq("id", document_id)
        .maybe_single()
        .execute()
    )
    document = result.data if result else None
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your document")
    return document


def _get_material(admin, document_id: str) -> str:
    chunks = (
        admin.table("document_chunks")
        .select("content")
        .eq("document_id", document_id)
        .order("chunk_index")
        .execute()
        .data
        or []
    )
    if not chunks:
        raise HTTPException(
            status_code=400, detail="No processed text found for this document"
        )
    return "\n\n".join(c["content"] for c in chunks)[:MAX_CONTEXT_CHARS]


def create_quiz_from_material(
    admin, document_id: str, user_id: str, material: str
) -> int:
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": QUIZ_PROMPT % material}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        parsed = json.loads(completion.choices[0].message.content)
        concepts_data = parsed["concepts"]
        if not concepts_data:
            raise ValueError("Model returned no concepts")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {exc}")

    # Regenerating replaces any previous quiz for this document.
    admin.table("concepts").delete().eq("document_id", document_id).execute()

    created_count = 0
    for index, item in enumerate(concepts_data):
        concept = (
            admin.table("concepts")
            .insert(
                {
                    "document_id": document_id,
                    "user_id": user_id,
                    "name": item["name"],
                    "order_index": index,
                }
            )
            .execute()
            .data[0]
        )

        admin.table("quiz_questions").insert(
            {
                "concept_id": concept["id"],
                "document_id": document_id,
                "user_id": user_id,
                "question_text": item["question"],
                "options": item["options"],
                "correct_index": item["correct_index"],
            }
        ).execute()

        admin.table("concept_mastery").insert(
            {"concept_id": concept["id"], "user_id": user_id, "mastery_score": 0}
        ).execute()

        created_count += 1

    admin.table("documents").update({"status": "quiz_ready"}).eq(
        "id", document_id
    ).execute()

    return created_count


@router.post("/documents/{document_id}/generate-quiz")
def generate_quiz(
    document_id: str, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    document = _get_owned_document(admin, document_id, user_id)
    if document["status"] not in ("processed", "quiz_ready"):
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready (status: {document['status']})",
        )

    material = _get_material(admin, document_id)
    created_count = create_quiz_from_material(admin, document_id, user_id, material)

    questions = (
        admin.table("quiz_questions")
        .select("id, concept_id, question_text, options")
        .eq("document_id", document_id)
        .execute()
        .data
        or []
    )

    return {
        "status": "quiz_ready",
        "concept_count": created_count,
        "questions": questions,
    }


WEAK_CONCEPT_LIMIT = 3


@router.post("/documents/{document_id}/practice")
def generate_practice(
    document_id: str, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    document = _get_owned_document(admin, document_id, user_id)

    concepts = (
        admin.table("concepts")
        .select("id, name")
        .eq("document_id", document_id)
        .execute()
        .data
        or []
    )
    if not concepts:
        raise HTTPException(
            status_code=400,
            detail="Generate the diagnostic quiz first so there are concepts to practice.",
        )

    concept_ids = [c["id"] for c in concepts]
    mastery_rows = (
        admin.table("concept_mastery")
        .select("concept_id, mastery_score")
        .in_("concept_id", concept_ids)
        .execute()
        .data
        or []
    )
    mastery_by_concept = {m["concept_id"]: m["mastery_score"] for m in mastery_rows}

    ranked = sorted(concepts, key=lambda c: mastery_by_concept.get(c["id"], 0))
    weak_concepts = ranked[:WEAK_CONCEPT_LIMIT]
    concept_by_name = {c["name"]: c for c in weak_concepts}

    material = _get_material(admin, document_id)

    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": PRACTICE_PROMPT
                    % (", ".join(concept_by_name.keys()), material),
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        parsed = json.loads(completion.choices[0].message.content)
        questions_data = parsed["questions"]
        if not questions_data:
            raise ValueError("Model returned no questions")
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Practice generation failed: {exc}"
        )

    created = []
    for item in questions_data:
        concept = concept_by_name.get(item["concept_name"])
        if not concept:
            continue

        question = (
            admin.table("quiz_questions")
            .insert(
                {
                    "concept_id": concept["id"],
                    "document_id": document_id,
                    "user_id": user_id,
                    "question_text": item["question"],
                    "options": item["options"],
                    "correct_index": item["correct_index"],
                }
            )
            .execute()
            .data[0]
        )
        created.append(question)

    return {"questions": created}


class QuizAnswer(BaseModel):
    question_id: str
    selected_index: int


@router.post("/quiz/submit")
def submit_quiz(
    answers: list[QuizAnswer], authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    affected_concepts: set[str] = set()
    results = []

    for answer in answers:
        question = (
            admin.table("quiz_questions")
            .select("*")
            .eq("id", answer.question_id)
            .maybe_single()
            .execute()
            .data
        )
        if not question or question["user_id"] != user_id:
            continue

        is_correct = answer.selected_index == question["correct_index"]

        admin.table("quiz_responses").insert(
            {
                "question_id": question["id"],
                "concept_id": question["concept_id"],
                "user_id": user_id,
                "selected_index": answer.selected_index,
                "is_correct": is_correct,
            }
        ).execute()

        affected_concepts.add(question["concept_id"])
        results.append(
            {
                "question_id": question["id"],
                "is_correct": is_correct,
                "correct_index": question["correct_index"],
            }
        )

    # Concepts with the same name across different documents (e.g. the same
    # "Mitochondria" topic in two uploads) are treated as one topic for
    # mastery purposes: answering questions about it under either document
    # updates a single pooled score shared by every matching concept row,
    # instead of tracking each document's copy separately.
    concept_groups_seen: set[frozenset[str]] = set()
    mastery_updates = []
    for concept_id in affected_concepts:
        concept = (
            admin.table("concepts")
            .select("name")
            .eq("id", concept_id)
            .maybe_single()
            .execute()
            .data
        )
        sibling_ids = (
            admin.table("concepts")
            .select("id")
            .eq("user_id", user_id)
            .ilike("name", concept["name"])
            .execute()
            .data
            or []
        )
        group_ids = {row["id"] for row in sibling_ids} | {concept_id}

        group_key = frozenset(group_ids)
        if group_key in concept_groups_seen:
            continue
        concept_groups_seen.add(group_key)

        responses = (
            admin.table("quiz_responses")
            .select("is_correct")
            .in_("concept_id", list(group_ids))
            .execute()
            .data
            or []
        )
        total = len(responses)
        correct = sum(1 for r in responses if r["is_correct"])
        score = round(100 * correct / total) if total else 0

        for group_concept_id in group_ids:
            admin.table("concept_mastery").update(
                {
                    "mastery_score": score,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("concept_id", group_concept_id).execute()
            mastery_updates.append(
                {"concept_id": group_concept_id, "mastery_score": score}
            )

    return {"mastery_updates": mastery_updates, "results": results}
