import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .ask import router as ask_router
from .demo import router as demo_router
from .documents import router as documents_router
from .flashcards import router as flashcards_router
from .quiz import router as quiz_router
from .streaks import router as streaks_router
from .study_guide import router as study_guide_router
from .transcribe import router as transcribe_router
from .tutor import router as tutor_router

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger("synaptiq")

app = FastAPI(title="Synaptiq API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://synaptiq-eta.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # An exception that escapes a route handler (e.g. a transient Supabase
    # or Groq connection blip) would otherwise surface as a bare 500 from
    # Starlette's ServerErrorMiddleware, which sits outside CORSMiddleware
    # and so ships without CORS headers - the browser reports that as an
    # opaque "Failed to fetch" with no visible error at all. Catching it
    # here keeps the response inside the normal middleware stack so it
    # still gets CORS headers, and gives the frontend's existing
    # friendly-error/retry UI something real to show instead of silence.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=502,
        content={"detail": "Something went wrong on our end. Please try again."},
    )

app.include_router(ask_router)
app.include_router(documents_router)
app.include_router(quiz_router)
app.include_router(tutor_router)
app.include_router(flashcards_router)
app.include_router(study_guide_router)
app.include_router(streaks_router)
app.include_router(demo_router)
app.include_router(transcribe_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "supabase_url_configured": bool(os.getenv("SUPABASE_URL")),
        "supabase_key_configured": bool(os.getenv("SUPABASE_PUBLISHABLE_KEY")),
    }
