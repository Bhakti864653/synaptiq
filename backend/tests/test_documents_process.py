import pytest
from fastapi import HTTPException

from app import documents
from app.documents import get_user_id, process_document
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


# --- processing failure ---------------------------------------------------


def test_process_document_failure_sets_status_error_with_message(monkeypatch):
    doc = _owned_document(filename="slides.unsupported")
    fake = _make_fake(doc, b"irrelevant bytes", {"tok": "owner"})
    monkeypatch.setattr(documents, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        process_document("doc1", authorization="Bearer tok")

    assert exc_info.value.status_code == 500
    assert doc["status"] == "error"
    assert doc["error_message"]
    assert "Unsupported file type" in doc["error_message"]


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
