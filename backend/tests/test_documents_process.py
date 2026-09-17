from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app import documents
from app.documents import (
    PROCESSING_STALE_TIMEOUT_SECONDS,
    _claim_for_processing,
    get_user_id,
    is_supported_filename,
    process_document,
)
from conftest import FakeAdminClient


def _make_fake(document: dict, file_bytes: bytes, valid_tokens: dict[str, str]):
    return FakeAdminClient(
        tables={"documents": [document], "document_chunks": []},
        files={document["storage_path"]: file_bytes},
        valid_tokens=valid_tokens,
    )


def _owned_document(**overrides) -> dict:
    base = {
        "id": "doc1",
        "user_id": "owner",
        "filename": "notes.txt",
        "storage_path": "owner/notes.txt",
        "status": "uploaded",
        "error_message": None,
    }
    base.update(overrides)
    return base


# --- auth / ownership --------------------------------------------------


def test_get_user_id_rejects_missing_authorization():
    with pytest.raises(HTTPException) as exc_info:
        get_user_id(None)
    assert exc_info.value.status_code == 401


def test_get_user_id_rejects_a_token_with_no_matching_user(monkeypatch):
    fake = FakeAdminClient(valid_tokens={})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        get_user_id("Bearer bad-token")
    assert exc_info.value.status_code == 401


def test_process_document_404s_for_unknown_document(monkeypatch):
    fake = FakeAdminClient(tables={"documents": []}, valid_tokens={"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        process_document("no-such-doc", authorization="Bearer tok")
    assert exc_info.value.status_code == 404


def test_process_document_rejects_another_users_document(monkeypatch):
    doc = _owned_document()
    fake = _make_fake(doc, b"hello world", {"tok": "someone-else"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        process_document("doc1", authorization="Bearer tok")
    assert exc_info.value.status_code == 403


# --- successful processing -----------------------------------------------


def test_process_document_success_sets_status_processed_and_creates_chunks(
    monkeypatch,
):
    doc = _owned_document()
    fake = _make_fake(doc, b"hello world, this is my study material.", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    result = process_document("doc1", authorization="Bearer tok")

    assert result["status"] == "processed"
    assert doc["status"] == "processed"
    assert doc["error_message"] is None
    chunks = fake._tables["document_chunks"]
    assert len(chunks) == 1
    assert chunks[0]["content"] == "hello world, this is my study material."


# --- supported file formats -------------------------------------------


def test_is_supported_filename_accepts_every_documented_format():
    for name in ("a.pdf", "A.PDF", "b.pptx", "c.docx", "d.txt"):
        assert is_supported_filename(name)


def test_is_supported_filename_rejects_legacy_and_unknown_formats():
    for name in ("a.doc", "b.ppt", "c.xyz", "no-extension"):
        assert not is_supported_filename(name)


def test_process_document_rejects_unsupported_extension_with_a_clean_400(
    monkeypatch,
):
    doc = _owned_document(filename="slides.ppt")
    # Deliberately no file bytes registered for this storage path - if the
    # unsupported-format guard didn't short-circuit before ever touching
    # storage, the download itself would raise a different (unrelated)
    # error and this test would still incorrectly pass for the wrong
    # reason, so proving storage was never touched matters here.
    fake = FakeAdminClient(
        tables={"documents": [doc], "document_chunks": []},
        files={},
        valid_tokens={"tok": "owner"},
    )
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        process_document("doc1", authorization="Bearer tok")

    assert exc_info.value.status_code == 400
    assert "Unsupported file type" in exc_info.value.detail
    assert "PDF, PPTX, DOCX, or TXT" in exc_info.value.detail
    assert doc["status"] == "error"
    assert doc["error_message"] == exc_info.value.detail
    assert fake._tables["document_chunks"] == []


# --- processing failure ---------------------------------------------------


def test_process_document_failure_on_corrupt_supported_file(monkeypatch):
    # A genuinely supported extension whose content still fails to parse -
    # distinct from the unsupported-extension case above, which never even
    # reaches extraction.
    doc = _owned_document(filename="broken.pdf")
    fake = _make_fake(doc, b"this is not a real pdf file at all", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        process_document("doc1", authorization="Bearer tok")

    assert exc_info.value.status_code == 500
    assert doc["status"] == "error"
    assert doc["error_message"]


def test_process_document_failure_on_empty_extracted_text(monkeypatch):
    doc = _owned_document(filename="empty.txt")
    fake = _make_fake(doc, b"   \n\n  ", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException):
        process_document("doc1", authorization="Bearer tok")

    assert doc["status"] == "error"
    assert "No extractable text" in doc["error_message"]


# --- retry safety -----------------------------------------------------------


def test_repeated_processing_does_not_duplicate_chunks_or_documents(monkeypatch):
    doc = _owned_document()
    fake = _make_fake(doc, b"hello world, this is my study material.", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    process_document("doc1", authorization="Bearer tok")
    process_document("doc1", authorization="Bearer tok")
    process_document("doc1", authorization="Bearer tok")

    assert len(fake._tables["document_chunks"]) == 1
    assert len(fake._tables["documents"]) == 1
    assert doc["status"] == "processed"


def test_retry_after_failure_can_succeed_once_the_underlying_issue_is_fixed(
    monkeypatch,
):
    doc = _owned_document(filename="broken.unsupported")
    fake = _make_fake(doc, b"irrelevant", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException):
        process_document("doc1", authorization="Bearer tok")
    assert doc["status"] == "error"

    # Simulate the fix: the document actually has a real, supported file
    # now (e.g. re-uploaded), same document row - retrying must succeed and
    # clear the previous error, not get stuck because of the earlier one.
    doc["filename"] = "notes.txt"
    fake.storage._files[doc["storage_path"]] = b"now this is real, extractable text."

    result = process_document("doc1", authorization="Bearer tok")
    assert result["status"] == "processed"
    assert doc["status"] == "processed"
    assert doc["error_message"] is None
    assert len(fake._tables["document_chunks"]) == 1


# --- stalled-processing recovery --------------------------------------------


def test_healthy_processing_is_not_treated_as_stalled(monkeypatch):
    now = datetime.now(timezone.utc)
    doc = _owned_document(
        status="processing",
        processing_started_at=now.isoformat(),
    )
    fake = _make_fake(doc, b"irrelevant", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    assert _claim_for_processing(fake, doc) is False


def test_process_document_rejects_a_healthy_in_flight_request_with_409(monkeypatch):
    now = datetime.now(timezone.utc)
    doc = _owned_document(
        status="processing",
        processing_started_at=now.isoformat(),
    )
    fake = _make_fake(doc, b"hello world, this is my study material.", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        process_document("doc1", authorization="Bearer tok")

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "ALREADY_PROCESSING"
    # Nothing about the document should have been touched by this rejected
    # attempt - it's still exactly the same healthy in-flight state.
    assert doc["status"] == "processing"
    assert fake._tables["document_chunks"] == []


def test_stalled_processing_is_detected_and_reclaimed(monkeypatch):
    stale_time = datetime.now(timezone.utc) - timedelta(
        seconds=PROCESSING_STALE_TIMEOUT_SECONDS + 30
    )
    doc = _owned_document(status="processing", processing_started_at=stale_time.isoformat())
    fake = _make_fake(doc, b"hello world, this is my study material.", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    result = process_document("doc1", authorization="Bearer tok")

    assert result["status"] == "processed"
    assert doc["status"] == "processed"
    assert len(fake._tables["document_chunks"]) == 1


def test_a_document_that_never_recorded_a_processing_start_time_is_treated_as_stale(
    monkeypatch,
):
    """A document that reached "processing" before this column existed (or
    any other way processing_started_at ended up null) has no evidence it's
    still healthy - reclaiming it is always safe."""
    doc = _owned_document(status="processing", processing_started_at=None)
    fake = _make_fake(doc, b"hello world, this is my study material.", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    result = process_document("doc1", authorization="Bearer tok")

    assert result["status"] == "processed"


# --- concurrent claim attempts -----------------------------------------------


def test_claim_for_processing_reclaims_a_stale_document_with_null_started_at():
    """Directly exercises _claim_for_processing's reclaim UPDATE for a
    processing_started_at=NULL row - proves the CAS uses PostgREST's
    .is_() null filter and not .eq(column, None), which real Postgres
    would compile to `= NULL` and never match. A fake that treated Python
    `None == None` as equivalent to SQL's NULL semantics would let this
    pass even with the old, broken .eq(...)-based code - this test only
    means something because conftest.FakeQuery now models .is_() for real.
    """
    doc = _owned_document(status="processing", processing_started_at=None)
    fake = FakeAdminClient(tables={"documents": [dict(doc)]})
    snapshot = dict(doc)

    assert _claim_for_processing(fake, snapshot) is True
    reclaimed = fake._tables["documents"][0]
    assert reclaimed["status"] == "processing"
    assert reclaimed["processing_started_at"] is not None


def test_concurrent_claim_attempts_on_an_uploaded_document_only_let_one_through():
    """Simulates two nearly-simultaneous requests that both read the row
    while it was still "uploaded", before either had written anything -
    only the first's conditional UPDATE may actually match."""
    doc = _owned_document()
    fake = FakeAdminClient(tables={"documents": [dict(doc)]})
    snapshot_a = dict(doc)
    snapshot_b = dict(doc)

    assert _claim_for_processing(fake, snapshot_a) is True
    # snapshot_b still thinks status is "uploaded" - the real row is now
    # "processing", so this conditional update must match zero rows.
    assert _claim_for_processing(fake, snapshot_b) is False


def test_concurrent_reclaim_attempts_on_the_same_stale_document_only_let_one_through():
    stale_time = datetime.now(timezone.utc) - timedelta(
        seconds=PROCESSING_STALE_TIMEOUT_SECONDS + 30
    )
    doc = _owned_document(status="processing", processing_started_at=stale_time.isoformat())
    fake = FakeAdminClient(tables={"documents": [dict(doc)]})
    snapshot_a = dict(doc)
    snapshot_b = dict(doc)

    assert _claim_for_processing(fake, snapshot_a) is True
    # snapshot_b still carries the old processing_started_at - the real row
    # now has a fresh one, so this reclaim attempt must lose the race.
    assert _claim_for_processing(fake, snapshot_b) is False
