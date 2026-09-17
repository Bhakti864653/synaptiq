import io
from datetime import datetime, timezone

from docx import Document as DocxDocument
from fastapi import APIRouter, Header, HTTPException
from pptx import Presentation
from pypdf import PdfReader

from .supabase_client import get_admin_client

router = APIRouter()

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150

# python-docx/python-pptx only parse the OOXML formats (.docx/.pptx) - the
# legacy binary .doc/.ppt formats need a different parser entirely and
# aren't supported. Kept as the single source of truth for both the
# friendly-message text and the actual extraction dispatch below, so the
# two can never drift out of sync.
SUPPORTED_EXTENSIONS = (".pdf", ".pptx", ".docx", ".txt")
SUPPORTED_FORMATS_LABEL = "PDF, PPTX, DOCX, or TXT"

# How long a document may sit at status "processing" before it's treated as
# abandoned rather than genuinely still working. Processing is one
# synchronous request/response (download, extract, chunk, write) with no
# legitimate reason to take anywhere near this long - a document still
# "processing" past this point means the request that started it died
# without ever reaching the except block (a server restart, a killed
# worker), not that it's just slow.
PROCESSING_STALE_TIMEOUT_SECONDS = 120


def is_supported_filename(filename: str) -> bool:
    return filename.lower().endswith(SUPPORTED_EXTENSIONS)


def extract_text(file_bytes: bytes, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)
    if lower.endswith(".pptx"):
        prs = Presentation(io.BytesIO(file_bytes))
        slides_text = []
        for slide in prs.slides:
            texts = [shape.text for shape in slide.shapes if shape.has_text_frame]
            slides_text.append("\n".join(texts))
        return "\n\n".join(slides_text)
    if lower.endswith(".docx"):
        doc = DocxDocument(io.BytesIO(file_bytes))
        return "\n\n".join(p.text for p in doc.paragraphs)
    if lower.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type: {filename}")


def chunk_text(
    text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP
) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}" if current else para
            continue

        if current:
            chunks.append(current)

        if len(para) > chunk_size:
            for i in range(0, len(para), chunk_size - overlap):
                chunks.append(para[i : i + chunk_size])
            current = ""
        else:
            current = para

    if current:
        chunks.append(current)
    return chunks


def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    admin = get_admin_client()
    result = admin.auth.get_user(token)
    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return result.user.id


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    doc_result = (
        admin.table("documents")
        .select("*")
        .eq("id", document_id)
        .maybe_single()
        .execute()
    )
    document = doc_result.data if doc_result else None
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your document")

    concept_ids = [
        c["id"]
        for c in (
            admin.table("concepts")
            .select("id")
            .eq("document_id", document_id)
            .execute()
            .data
            or []
        )
    ]

    # Children before parents, mirroring DEMO_TABLES_IN_DELETE_ORDER in demo.py.
    if concept_ids:
        admin.table("quiz_responses").delete().in_("concept_id", concept_ids).execute()
        admin.table("concept_mastery").delete().in_(
            "concept_id", concept_ids
        ).execute()
    admin.table("quiz_questions").delete().eq("document_id", document_id).execute()
    admin.table("flashcards").delete().eq("document_id", document_id).execute()
    admin.table("concepts").delete().eq("document_id", document_id).execute()
    admin.table("document_chunks").delete().eq("document_id", document_id).execute()

    admin.storage.from_("study-materials").remove([document["storage_path"]])
    admin.table("documents").delete().eq("id", document_id).execute()

    return {"status": "deleted"}


def _is_stale_processing(processing_started_at: str | None, now: datetime) -> bool:
    """A missing timestamp (a document that reached "processing" before
    this column existed) is treated as stale immediately - there's no
    evidence it's still healthy, and reclaiming it is always safe."""
    if not processing_started_at:
        return True
    try:
        started = datetime.fromisoformat(processing_started_at)
    except ValueError:
        return True
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    return (now - started).total_seconds() >= PROCESSING_STALE_TIMEOUT_SECONDS


def _claim_for_processing(admin, document: dict) -> bool:
    """Atomically claims the right to (re)run processing for this document,
    returning True if this call should actually do the work. Two paths:

    1. The document isn't currently "processing" (uploaded/error/processed/
       quiz_ready): claim it via a conditional UPDATE keyed on its exact
       last-known status. Postgres only ever lets one such UPDATE match
       those old values, so a second, near-simultaneous caller reading the
       same starting status loses the race and gets back zero rows instead
       of a duplicate attempt.
    2. The document IS "processing": only reclaim it if it looks abandoned
       (see _is_stale_processing) - a genuinely healthy in-flight request
       must never be duplicated. The reclaim UPDATE is itself conditioned
       on the exact processing_started_at value just read, as a
       best-effort (timestamp-equality, not a hard guarantee against every
       possible postgrest formatting edge case) guard against two callers
       both detecting the same stale window and both reclaiming it.
    """
    document_id = document["id"]
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    if document["status"] != "processing":
        result = (
            admin.table("documents")
            .update({"status": "processing", "processing_started_at": now_iso})
            .eq("id", document_id)
            .eq("status", document["status"])
            .execute()
        )
        return bool(result and result.data)

    if not _is_stale_processing(document.get("processing_started_at"), now):
        return False

    previous_started_at = document.get("processing_started_at")
    query = (
        admin.table("documents")
        .update({"processing_started_at": now_iso})
        .eq("id", document_id)
        .eq("status", "processing")
    )
    if previous_started_at is None:
        # PostgREST's eq operator never matches NULL (it compiles to
        # `= NULL`, which SQL always evaluates to unknown) - .is_() is the
        # only correct way to express "processing_started_at IS NULL" here.
        query = query.is_("processing_started_at", "null")
    else:
        query = query.eq("processing_started_at", previous_started_at)
    result = query.execute()
    return bool(result and result.data)


@router.post("/documents/{document_id}/process")
def process_document(
    document_id: str, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    doc_result = (
        admin.table("documents")
        .select("*")
        .eq("id", document_id)
        .maybe_single()
        .execute()
    )
    document = doc_result.data if doc_result else None
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your document")

    if not is_supported_filename(document["filename"]):
        message = f"Unsupported file type. Supported formats: {SUPPORTED_FORMATS_LABEL}."
        admin.table("documents").update(
            {"status": "error", "error_message": message}
        ).eq("id", document_id).execute()
        raise HTTPException(status_code=400, detail=message)

    if not _claim_for_processing(admin, document):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "ALREADY_PROCESSING",
                "message": "This document is already being processed.",
            },
        )

    try:
        file_bytes = admin.storage.from_("study-materials").download(
            document["storage_path"]
        )
        text = extract_text(file_bytes, document["filename"])
        if not text.strip():
            raise ValueError("No extractable text found in this file.")
        chunks = chunk_text(text)

        admin.table("document_chunks").delete().eq(
            "document_id", document_id
        ).execute()
        rows = [
            {
                "document_id": document_id,
                "user_id": user_id,
                "chunk_index": i,
                "content": chunk,
            }
            for i, chunk in enumerate(chunks)
        ]
        if rows:
            admin.table("document_chunks").insert(rows).execute()

        admin.table("documents").update(
            {"status": "processed", "error_message": None}
        ).eq("id", document_id).execute()
        return {"status": "processed", "chunk_count": len(chunks)}
    except Exception as exc:
        admin.table("documents").update(
            {"status": "error", "error_message": str(exc)}
        ).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=str(exc))
