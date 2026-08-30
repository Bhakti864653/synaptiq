import json
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from .documents import get_user_id
from .quiz import (
    GROQ_MODEL,
    _get_material,
    _get_owned_document,
    create_quiz_from_material,
    get_groq_client,
)
from .supabase_client import get_admin_client

router = APIRouter()

TOPIC_QUIZ_QUESTION_COUNT = 5
PASS_THRESHOLD = 80
MIN_WEIGHT = 10  # even a nearly-mastered topic gets a light review slot

GUIDE_PROMPT = """You are an expert tutor preparing an in-depth study guide for one topic from a student's own material.

Below is the student's study material, followed by the name of ONE topic to explain.

Topic: %s

Do two things:
1. Write a thorough explanation (2-4 short paragraphs) of this topic in your own words, suitable for a student learning it for the first time, using only information from the material. Cover what the concept is, why it matters or how it connects to the rest of the material, and (if the material supports it) how it plays out in a concrete case - not just a one-line definition.
2. Copy one short passage (1-4 sentences) VERBATIM from the material below that best illustrates or supports this topic. Do not paraphrase or invent it - copy it exactly as it appears in the material.

Respond with ONLY valid JSON in this exact shape, no other text:
{
  "summary": "your explanation here (use \\n\\n between paragraphs)",
  "excerpt": "the verbatim passage copied exactly from the material"
}

Study material:
---
%s
---
"""

TOPIC_QUIZ_PROMPT = """You are an expert tutor creating a short quiz on ONE topic from a student's own study material.

Below is the student's study material, followed by the name of ONE topic to quiz on.

Topic: %s

Write exactly 5 multiple-choice questions (each with 4 answer options) that test understanding of this topic, using only information from the material. Vary the angle of each question - don't just restate the same fact five ways.

Respond with ONLY valid JSON in this exact shape, no other text:
{
  "questions": [
    {"question": "Question text", "options": ["option A", "option B", "option C", "option D"], "correct_index": 0}
  ]
}

Study material:
---
%s
---
"""


def _weighted_minutes(
    concepts: list[dict], mastery_by_concept: dict, total_minutes: int
) -> dict:
    """Splits a time budget across concepts, giving weaker concepts more
    time (a nearly-mastered concept still gets a light MIN_WEIGHT review
    slot rather than zero)."""
    weighted = [
        (c["id"], max(100 - mastery_by_concept.get(c["id"], 0), MIN_WEIGHT))
        for c in concepts
    ]
    total_weight = sum(w for _, w in weighted) or 1
    return {
        concept_id: round(total_minutes * weight / total_weight)
        for concept_id, weight in weighted
    }


class StudySetupRequest(BaseModel):
    minutes_available: int


@router.post("/documents/{document_id}/study-setup")
def study_setup(
    document_id: str,
    body: StudySetupRequest,
    authorization: str | None = Header(default=None),
):
    """First-time Study Guide setup for a document: extracts topics from the
    material if this is the first visit, then splits the given time budget
    across them - evenly if the student is starting from zero (no mastery
    signal exists yet), weighted toward weaker topics if they've already
    taken the diagnostic quiz."""
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    document = _get_owned_document(admin, document_id, user_id)

    if document["status"] == "processed":
        material = _get_material(admin, document_id)
        create_quiz_from_material(admin, document_id, user_id, material)

    concepts = (
        admin.table("concepts")
        .select("id, name, order_index")
        .eq("document_id", document_id)
        .order("order_index")
        .execute()
        .data
        or []
    )
    if not concepts:
        raise HTTPException(
            status_code=400, detail="No topics could be found in this material."
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

    minutes_by_concept = _weighted_minutes(
        concepts, mastery_by_concept, body.minutes_available
    )

    return {"minutes_by_concept": minutes_by_concept}


class StudyPlanRequest(BaseModel):
    exam_date: date
    hours_per_day: float


@router.post("/documents/{document_id}/study-plan")
def build_study_plan(
    document_id: str,
    body: StudyPlanRequest,
    authorization: str | None = Header(default=None),
):
    """Re-sequence not-yet-passed topics by urgency (weakest mastery first)
    and estimate minutes per topic from the exam date/hours available.
    Already-passed topics keep their position - they're never re-locked."""
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)

    concepts = (
        admin.table("concepts")
        .select("id, name, order_index")
        .eq("document_id", document_id)
        .order("order_index")
        .execute()
        .data
        or []
    )
    if not concepts:
        raise HTTPException(
            status_code=400,
            detail="Generate the diagnostic quiz first so there are topics to plan.",
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

    passed = [c for c in concepts if mastery_by_concept.get(c["id"], 0) >= PASS_THRESHOLD]
    remaining = [c for c in concepts if mastery_by_concept.get(c["id"], 0) < PASS_THRESHOLD]

    today = datetime.now(timezone.utc).date()
    days_until_exam = max((body.exam_date - today).days, 1)
    total_minutes = round(days_until_exam * body.hours_per_day * 60)

    minutes_by_concept = _weighted_minutes(remaining, mastery_by_concept, total_minutes)
    remaining.sort(key=lambda c: minutes_by_concept[c["id"]], reverse=True)

    plan = []
    next_index = len(passed)
    for c in remaining:
        admin.table("concepts").update({"order_index": next_index}).eq(
            "id", c["id"]
        ).execute()
        plan.append(
            {
                "concept_id": c["id"],
                "name": c["name"],
                "minutes": minutes_by_concept[c["id"]],
            }
        )
        next_index += 1

    return {"days_until_exam": days_until_exam, "plan": plan}


def _get_owned_concept(admin, document_id: str, concept_id: str) -> dict:
    concept = (
        admin.table("concepts")
        .select("*")
        .eq("id", concept_id)
        .maybe_single()
        .execute()
        .data
    )
    if not concept or concept["document_id"] != document_id:
        raise HTTPException(status_code=404, detail="Topic not found for this document")
    return concept


@router.post("/documents/{document_id}/concepts/{concept_id}/guide")
def get_or_create_guide(
    document_id: str,
    concept_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)
    concept = _get_owned_concept(admin, document_id, concept_id)

    if concept.get("summary") and concept.get("excerpt"):
        return {"summary": concept["summary"], "excerpt": concept["excerpt"]}

    material = _get_material(admin, document_id)

    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "user", "content": GUIDE_PROMPT % (concept["name"], material)}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        parsed = json.loads(completion.choices[0].message.content)
        summary = parsed["summary"]
        excerpt = parsed["excerpt"]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Guide generation failed: {exc}")

    admin.table("concepts").update({"summary": summary, "excerpt": excerpt}).eq(
        "id", concept_id
    ).execute()

    return {"summary": summary, "excerpt": excerpt}


@router.post("/documents/{document_id}/concepts/{concept_id}/quiz")
def generate_topic_quiz(
    document_id: str,
    concept_id: str,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)
    concept = _get_owned_concept(admin, document_id, concept_id)

    # Clear any prior attempt so mastery_score (which averages over ALL
    # quiz_responses ever recorded for a concept) reflects only the fresh
    # attempt about to happen - otherwise a failed try followed by a
    # perfect retry could still average under the pass threshold.
    old_ids = [
        q["id"]
        for q in admin.table("quiz_questions")
        .select("id")
        .eq("concept_id", concept_id)
        .execute()
        .data
        or []
    ]
    if old_ids:
        admin.table("quiz_responses").delete().in_("question_id", old_ids).execute()
    admin.table("quiz_questions").delete().eq("concept_id", concept_id).execute()
    admin.table("concept_mastery").update({"mastery_score": 0}).eq(
        "concept_id", concept_id
    ).execute()

    material = _get_material(admin, document_id)

    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": TOPIC_QUIZ_PROMPT % (concept["name"], material),
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        parsed = json.loads(completion.choices[0].message.content)
        questions_data = parsed["questions"]
        if not questions_data:
            raise ValueError("Model returned no questions")
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Topic quiz generation failed: {exc}"
        )

    created = []
    for item in questions_data:
        question = (
            admin.table("quiz_questions")
            .insert(
                {
                    "concept_id": concept_id,
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
