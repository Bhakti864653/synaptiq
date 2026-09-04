import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from groq import Groq
from pydantic import BaseModel, Field

from .documents import get_user_id
from .rate_limit import rate_limit
from .supabase_client import get_admin_client
from .streaks import record_study_session

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


def _require_keys(item: dict, keys: tuple[str, ...]) -> None:
    """Raises ValueError naming any of `keys` missing from a Groq-generated
    JSON item - the shared failure mode for a malformed model response,
    surfaced as a clean error instead of an unguarded KeyError deep in a
    DB-insert loop."""
    missing = [k for k in keys if k not in item]
    if missing:
        raise ValueError(f"Model response missing field(s): {', '.join(missing)}")


def _validate_quiz_item(item: dict, keys: tuple[str, ...]) -> None:
    """Validates a Groq-generated multiple-choice question object: all
    `keys` present, options is a non-empty list, and correct_index actually
    indexes into it."""
    _require_keys(item, keys)
    options = item["options"]
    if not isinstance(options, list) or not options:
        raise ValueError("Model response has invalid 'options'")
    if not isinstance(item["correct_index"], int) or not (
        0 <= item["correct_index"] < len(options)
    ):
        raise ValueError("Model response has an out-of-range 'correct_index'")


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
        for item in concepts_data:
            _validate_quiz_item(item, ("name", "question", "options", "correct_index"))
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
    document_id: str,
    user_id: str = Depends(rate_limit("quiz-generate", 10, 3600)),
):
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
    document_id: str,
    user_id: str = Depends(rate_limit("practice", 15, 3600)),
):
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
        for item in questions_data:
            _validate_quiz_item(
                item, ("concept_name", "question", "options", "correct_index")
            )
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


GLOBAL_PRACTICE_LIMIT = 5


@router.post("/practice")
def generate_global_practice(
    user_id: str = Depends(rate_limit("global-practice", 15, 3600)),
):
    """Practice across every document at once, not just one - pools the
    user's weakest concepts regardless of which material they came from."""
    admin = get_admin_client()

    concepts = (
        admin.table("concepts")
        .select("id, name, document_id")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    if not concepts:
        raise HTTPException(
            status_code=400,
            detail="Upload some material first so there are concepts to practice.",
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

    weak_concepts = sorted(
        concepts, key=lambda c: mastery_by_concept.get(c["id"], 0)
    )[:GLOBAL_PRACTICE_LIMIT]

    by_document: dict[str, list[dict]] = {}
    for c in weak_concepts:
        by_document.setdefault(c["document_id"], []).append(c)

    documents = (
        admin.table("documents")
        .select("id, filename")
        .in_("id", list(by_document.keys()))
        .execute()
        .data
        or []
    )
    filename_by_document = {d["id"]: d["filename"] for d in documents}

    client = get_groq_client()
    created = []
    for document_id, doc_concepts in by_document.items():
        material = _get_material(admin, document_id)
        concept_by_name = {c["name"]: c for c in doc_concepts}

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
            for item in questions_data:
                _validate_quiz_item(
                    item, ("concept_name", "question", "options", "correct_index")
                )
        except Exception:
            # One document's generation failing shouldn't sink the whole
            # cross-document batch - just skip it and use what did work.
            continue

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
            created.append(
                {
                    **question,
                    "concept_name": concept["name"],
                    "document_filename": filename_by_document.get(document_id, ""),
                }
            )

    if not created:
        raise HTTPException(
            status_code=502,
            detail="Couldn't generate practice questions right now. Please try again.",
        )

    return {"questions": created}


class QuizAnswer(BaseModel):
    question_id: str
    selected_index: int
    confidence: int | None = Field(default=None, ge=1, le=5)


def _escape_like(value: str) -> str:
    """Escapes literal backslash/%/_ so an ilike() call matches the exact
    string instead of treating those characters as SQL LIKE wildcards - a
    concept name like "50% Rule" would otherwise fuzzy-match and merge
    unrelated concepts."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _response_points(is_correct: bool, confidence: int | None) -> float:
    """Score a single response from 0-100. Without a confidence rating this
    is just the plain binary correct/incorrect signal. With one, a
    confident correct answer counts as stronger evidence of real mastery
    than a low-confidence (likely guessed) correct answer, and a confident
    wrong answer - a real misconception, not a slip - counts more heavily
    against it than an unsure wrong answer."""
    if confidence is None:
        return 100.0 if is_correct else 0.0
    if is_correct:
        return 50.0 + 10.0 * confidence
    return 50.0 - 10.0 * confidence


def _compute_mastery_score(responses: list[dict]) -> int:
    """Aggregates a concept's quiz responses (each a dict with "is_correct"
    and "confidence") into a single 0-100 mastery score. A concept with no
    responses yet has 0 mastery (unattempted, not "average")."""
    if not responses:
        return 0
    total_points = sum(
        _response_points(r["is_correct"], r["confidence"]) for r in responses
    )
    return max(0, min(100, round(total_points / len(responses))))


def _mastery_history_points(responses: list[dict]) -> list[dict]:
    """Turns a concept's quiz responses (each a dict with "answered_at"
    (an ISO date/datetime string), "is_correct", and "confidence") into a
    cumulative mastery-over-time series: one point per day that has at
    least one response, scored using every response up through and
    including that day - the same rolling window the live mastery score
    itself is computed from, just sampled at earlier points in time."""
    responses_by_day: dict[str, list[dict]] = {}
    for r in responses:
        day = r["answered_at"][:10]
        responses_by_day.setdefault(day, []).append(r)

    points = []
    seen_so_far: list[dict] = []
    for day in sorted(responses_by_day):
        seen_so_far.extend(responses_by_day[day])
        points.append({"date": day, "mastery_score": _compute_mastery_score(seen_so_far)})
    return points


def _pooled_concept_ids(admin, concept_name: str, user_id: str, concept_id: str) -> set[str]:
    """Same-named concepts across a user's different documents are pooled
    into one mastery score (see submit_quiz below) - this returns that same
    pooled set of concept ids for a given concept."""
    sibling_ids = (
        admin.table("concepts")
        .select("id")
        .eq("user_id", user_id)
        .ilike("name", _escape_like(concept_name))
        .execute()
        .data
        or []
    )
    return {row["id"] for row in sibling_ids} | {concept_id}


@router.get("/concepts/{concept_id}/mastery-history")
def get_mastery_history(
    concept_id: str, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    concept_result = (
        admin.table("concepts")
        .select("name")
        .eq("id", concept_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    concept = concept_result.data if concept_result else None
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    group_ids = _pooled_concept_ids(admin, concept["name"], user_id, concept_id)

    responses = (
        admin.table("quiz_responses")
        .select("is_correct, confidence, answered_at")
        .in_("concept_id", list(group_ids))
        .execute()
        .data
        or []
    )

    return {"points": _mastery_history_points(responses)}


@router.post("/quiz/submit")
def submit_quiz(
    answers: list[QuizAnswer], authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    affected_concepts: set[str] = set()
    results = []

    for answer in answers:
        question_result = (
            admin.table("quiz_questions")
            .select("*")
            .eq("id", answer.question_id)
            .maybe_single()
            .execute()
        )
        question = question_result.data if question_result else None
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
                "confidence": answer.confidence,
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
        concept_result = (
            admin.table("concepts")
            .select("name")
            .eq("id", concept_id)
            .maybe_single()
            .execute()
        )
        concept = concept_result.data if concept_result else None
        if not concept:
            continue
        group_ids = _pooled_concept_ids(admin, concept["name"], user_id, concept_id)

        group_key = frozenset(group_ids)
        if group_key in concept_groups_seen:
            continue
        concept_groups_seen.add(group_key)

        responses = (
            admin.table("quiz_responses")
            .select("is_correct, confidence")
            .in_("concept_id", list(group_ids))
            .execute()
            .data
            or []
        )
        score = _compute_mastery_score(responses)

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

    record_study_session(
        admin,
        user_id,
        questions_count=len(results),
        correct_count=sum(1 for r in results if r["is_correct"]),
    )

    return {"mastery_updates": mastery_updates, "results": results}
