import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException

from .demo_content import SAMPLE_FILENAME, SAMPLE_TEXT
from .documents import chunk_text
from .quiz import MAX_CONTEXT_CHARS, create_quiz_from_material
from .supabase_client import get_admin_client, get_anon_client

router = APIRouter()

DEMO_ACCOUNT_MAX_AGE = timedelta(hours=24)

# Deletion order matters: children before the parent rows they reference.
DEMO_TABLES_IN_DELETE_ORDER = [
    "quiz_responses",
    "quiz_questions",
    "concept_mastery",
    "flashcards",
    "concepts",
    "document_chunks",
    "documents",
]


@router.post("/demo/start")
def start_demo():
    admin = get_admin_client()

    # .invalid is reserved by RFC 2606 for exactly this purpose — a domain
    # guaranteed to never resolve, so demo accounts can never collide with
    # or send mail to a real address.
    email = f"demo-{uuid.uuid4()}@synaptiq-demo.invalid"
    password = secrets.token_urlsafe(24)

    created = admin.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"is_demo": True},
        }
    )
    user_id = created.user.id

    anon = get_anon_client()
    signed_in = anon.auth.sign_in_with_password(
        {"email": email, "password": password}
    )
    if not signed_in.session:
        raise HTTPException(status_code=500, detail="Could not start a demo session")

    document = (
        admin.table("documents")
        .insert(
            {
                "user_id": user_id,
                "filename": SAMPLE_FILENAME,
                "storage_path": f"demo/{user_id}",
                "file_type": "text/plain",
                "status": "processing",
            }
        )
        .execute()
        .data[0]
    )

    chunks = chunk_text(SAMPLE_TEXT)
    rows = [
        {
            "document_id": document["id"],
            "user_id": user_id,
            "chunk_index": i,
            "content": chunk,
        }
        for i, chunk in enumerate(chunks)
    ]
    if rows:
        admin.table("document_chunks").insert(rows).execute()

    admin.table("documents").update({"status": "processed"}).eq(
        "id", document["id"]
    ).execute()

    # The quiz is generated eagerly so the visitor lands on a fully populated
    # demo. If Groq is having a bad moment, the document is still usable —
    # they can hit "Generate diagnostic quiz" themselves, same as any user.
    try:
        create_quiz_from_material(
            admin, document["id"], user_id, SAMPLE_TEXT[:MAX_CONTEXT_CHARS]
        )
    except HTTPException:
        pass

    return {
        "access_token": signed_in.session.access_token,
        "refresh_token": signed_in.session.refresh_token,
    }


@router.post("/demo/cleanup")
def cleanup_demo_accounts(authorization: str | None = Header(default=None)):
    expected_secret = os.environ["DEMO_CLEANUP_SECRET"]
    if authorization != f"Bearer {expected_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    admin = get_admin_client()
    cutoff = datetime.now(timezone.utc) - DEMO_ACCOUNT_MAX_AGE

    deleted_count = 0
    for user in admin.auth.admin.list_users(per_page=1000):
        if not user.user_metadata.get("is_demo"):
            continue
        if user.created_at > cutoff:
            continue

        for table in DEMO_TABLES_IN_DELETE_ORDER:
            admin.table(table).delete().eq("user_id", user.id).execute()
        admin.auth.admin.delete_user(user.id)
        deleted_count += 1

    return {"deleted": deleted_count}
