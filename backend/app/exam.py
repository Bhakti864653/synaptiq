from datetime import date, datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from .documents import get_user_id
from .quiz import _get_owned_document
from .supabase_client import get_admin_client

router = APIRouter()

MIN_WEIGHT = 10  # even a fully-mastered concept gets a light review pass


class ExamPlanRequest(BaseModel):
    exam_date: date
    hours_per_day: float


@router.post("/documents/{document_id}/exam-plan")
def generate_exam_plan(
    document_id: str,
    body: ExamPlanRequest,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)

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
            detail="Generate the diagnostic quiz first so there's mastery data to plan around.",
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

    today = datetime.now(timezone.utc).date()
    days_until_exam = max((body.exam_date - today).days, 1)
    total_minutes = round(days_until_exam * body.hours_per_day * 60)

    weighted = [
        {
            "concept_id": c["id"],
            "name": c["name"],
            "mastery_score": mastery_by_concept.get(c["id"], 0),
            "weight": max(100 - mastery_by_concept.get(c["id"], 0), MIN_WEIGHT),
        }
        for c in concepts
    ]
    total_weight = sum(w["weight"] for w in weighted)

    plan = []
    for w in sorted(weighted, key=lambda w: w["weight"], reverse=True):
        minutes = round(total_minutes * w["weight"] / total_weight)
        plan.append(
            {
                "concept_id": w["concept_id"],
                "name": w["name"],
                "mastery_score": w["mastery_score"],
                "minutes": minutes,
            }
        )

    return {
        "days_until_exam": days_until_exam,
        "total_minutes": total_minutes,
        "plan": plan,
    }
