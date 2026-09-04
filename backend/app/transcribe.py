from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from .quiz import get_groq_client
from .rate_limit import rate_limit

router = APIRouter()

TRANSCRIBE_MODEL = "whisper-large-v3-turbo"
MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10MB - voice answers are a few seconds of speech


def _enforce_max_size(byte_length: int, max_bytes: int) -> None:
    """Raises a clean 413 if an uploaded file exceeds max_bytes, instead of
    forwarding an oversized file to Groq or buffering it unbounded."""
    if byte_length > max_bytes:
        raise HTTPException(status_code=413, detail="Audio file is too large (max 10MB).")


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    user_id: str = Depends(rate_limit("transcribe", 30, 3600)),
):
    # Starlette populates `.size` while parsing the multipart body, before this
    # handler even runs - check it first so an oversized upload can be rejected
    # without needing to read it. Still re-checked after read() as a fallback,
    # since `.size` isn't guaranteed to be set in every code path.
    if audio.size is not None:
        _enforce_max_size(audio.size, MAX_AUDIO_BYTES)

    audio_bytes = await audio.read()
    _enforce_max_size(len(audio_bytes), MAX_AUDIO_BYTES)

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
