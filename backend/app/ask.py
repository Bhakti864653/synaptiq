from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .quiz import GROQ_MODEL, get_groq_client
from .rate_limit import rate_limit

router = APIRouter()

ASK_SYSTEM_PROMPT = """You are a patient, knowledgeable tutor. A student is asking a general question that isn't tied to any specific uploaded material - answer it thoroughly using your own knowledge.

Give an in-depth, well-organized answer: explain the core idea clearly, cover the important nuances, and use a concrete example where it helps understanding. If the question is ambiguous, answer the most likely interpretation and note the ambiguity briefly rather than refusing to answer."""


class ChatMessage(BaseModel):
    role: str
    content: str


class AskRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []


@router.post("/ask")
def ask_question(body: AskRequest, user_id: str = Depends(rate_limit("ask", 30, 3600))):
    messages = [{"role": "system", "content": ASK_SYSTEM_PROMPT}]
    for msg in body.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.question})

    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.4,
        )
        answer = completion.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Question failed: {exc}")

    return {"answer": answer}
