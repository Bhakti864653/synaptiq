from fastapi import APIRouter, File, Header, HTTPException, UploadFile

from .documents import get_user_id
from .quiz import get_groq_client

router = APIRouter()

TRANSCRIBE_MODEL = "whisper-large-v3-turbo"


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    get_user_id(authorization)

    audio_bytes = await audio.read()
    client = get_groq_client()
    try:
        result = client.audio.transcriptions.create(
            model=TRANSCRIBE_MODEL,
            file=(audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm"),
            response_format="json",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    return {"text": result.text.strip()}
