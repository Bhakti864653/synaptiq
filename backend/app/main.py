import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

app = FastAPI(title="Synaptiq API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "supabase_url_configured": bool(os.getenv("SUPABASE_URL")),
        "supabase_key_configured": bool(os.getenv("SUPABASE_PUBLISHABLE_KEY")),
    }
