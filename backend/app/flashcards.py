import json
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from .documents import get_user_id
from .quiz import (
    GROQ_MODEL,
    _get_material,
    _get_owned_document,
    _require_keys,
    get_groq_client,
)
from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()

FLASHCARD_PROMPT = """You are an expert tutor creating flashcards from a student's own study material.

Read the material below and create 2 to 3 flashcards per distinct concept covered. Each flashcard should have a short "front" (a question or term) and a concise "back" (the answer or definition), using only information from the material.

Respond with ONLY valid JSON in this exact shape, no other text:
{
  "cards": [
    {
      "concept_name": "Concept this card belongs to",
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}

Study material:
---
%s
---
"""


@router.post("/documents/{document_id}/flashcards/generate")
def generate_flashcards(
    document_id: str,
    user_id: str = Depends(rate_limit("flashcards-generate", 10, 3600)),
):
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)
    material = _get_material(admin, document_id)

    concepts = (
        admin.table("concepts")
        .select("id, name")
        .eq("document_id", document_id)
        .execute()
        .data
        or []
    )
    concept_by_name = {c["name"]: c["id"] for c in concepts}

    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": FLASHCARD_PROMPT % material}],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        parsed = json.loads(completion.choices[0].message.content)
        cards_data = parsed["cards"]
        if not cards_data:
            raise ValueError("Model returned no flashcards")
        for item in cards_data:
            _require_keys(item, ("front", "back"))
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Flashcard generation failed: {exc}"
        )

    admin.table("flashcards").delete().eq("document_id", document_id).execute()

    rows = [
        {
            "document_id": document_id,
            "concept_id": concept_by_name.get(item.get("concept_name")),
            "user_id": user_id,
            "front": item["front"],
            "back": item["back"],
        }
        for item in cards_data
    ]
    inserted = admin.table("flashcards").insert(rows).execute().data or []

    return {"card_count": len(inserted)}


@router.get("/documents/{document_id}/flashcards/due")
def get_due_flashcards(
    document_id: str, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)

    today = datetime.now(timezone.utc).date().isoformat()
    cards = (
        admin.table("flashcards")
        .select("id, front, back, next_review_date")
        .eq("document_id", document_id)
        .lte("next_review_date", today)
        .order("next_review_date")
        .execute()
        .data
        or []
    )
    return {"cards": cards}


class ReviewRequest(BaseModel):
    quality: str  # "again" | "good" | "easy"


QUALITY_SCORES = {"again": 2, "good": 4, "easy": 5}


def _compute_sm2(
    quality: int, ease_factor: float, repetitions: int, interval_days: int
) -> tuple[int, float, int]:
    """SM-2 spaced-repetition scheduling. Returns the card's next
    (interval_days, ease_factor, repetitions) given a review quality score
    (2 = again, 4 = good, 5 = easy) and its current state. A quality below 3
    resets the card to being relearned from scratch (repetitions=0,
    interval=1 day); a lapse never drops ease_factor below the SM-2 floor
    of 1.3."""
    if quality < 3:
        repetitions = 0
        interval_days = 1
    else:
        if repetitions == 0:
            interval_days = 1
        elif repetitions == 1:
            interval_days = 6
        else:
            interval_days = round(interval_days * ease_factor)
        repetitions += 1

    ease_factor = max(
        1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
    return interval_days, ease_factor, repetitions


@router.post("/flashcards/{flashcard_id}/review")
def review_flashcard(
    flashcard_id: str,
    body: ReviewRequest,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    card_result = (
        admin.table("flashcards")
        .select("*")
        .eq("id", flashcard_id)
        .maybe_single()
        .execute()
    )
    card = card_result.data if card_result else None
    if not card or card["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    quality = QUALITY_SCORES.get(body.quality)
    if quality is None:
        raise HTTPException(status_code=400, detail="Invalid quality rating")

    interval_days, ease_factor, repetitions = _compute_sm2(
        quality,
        float(card["ease_factor"]),
        card["repetitions"],
        card["interval_days"],
    )
    next_review_date = date.today() + timedelta(days=interval_days)

    admin.table("flashcards").update(
        {
            "interval_days": interval_days,
            "ease_factor": ease_factor,
            "repetitions": repetitions,
            "next_review_date": next_review_date.isoformat(),
            "last_reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", flashcard_id).execute()

    return {
        "interval_days": interval_days,
        "next_review_date": next_review_date.isoformat(),
    }
