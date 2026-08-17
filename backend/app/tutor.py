from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from .documents import get_user_id
from .quiz import GROQ_MODEL, _get_material, _get_owned_document, get_groq_client
from .supabase_client import get_admin_client

router = APIRouter()

TUTOR_SYSTEM_PROMPT = """You are a patient, encouraging tutor helping a student understand their own study material.

Rules:
- Answer ONLY using the study material provided below. Do not use outside knowledge.
- If the material doesn't contain enough information to answer, say so honestly instead of guessing.
- Keep answers clear and concise, and relate them back to the material where possible.

Study material:
---
%s
---
"""


class ChatMessage(BaseModel):
    role: str
    content: str


class TutorRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []


@router.post("/documents/{document_id}/tutor")
def ask_tutor(
    document_id: str,
    body: TutorRequest,
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    _get_owned_document(admin, document_id, user_id)
    material = _get_material(admin, document_id)

    messages = [{"role": "system", "content": TUTOR_SYSTEM_PROMPT % material}]
    for msg in body.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.question})

    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.3,
        )
        answer = completion.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Tutor request failed: {exc}")

    return {"answer": answer}
