import pytest
from fastapi import HTTPException

from app import quiz
from app.quiz import (
    _raise_practice_not_ready,
    generate_global_practice,
    generate_practice,
)
from conftest import FakeAdminClient


def _detail(exc_info):
    return exc_info.value.detail


# --- _raise_practice_not_ready priority ------------------------------------


def test_raises_no_documents_when_list_is_empty():
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready([])
    assert _detail(exc_info)["code"] == "NO_DOCUMENTS"
    assert _detail(exc_info)["document_id"] is None


def test_raises_processing_when_a_document_is_uploaded():
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready([{"id": "d1", "status": "uploaded"}])
    assert _detail(exc_info)["code"] == "PROCESSING"
    assert _detail(exc_info)["document_id"] == "d1"


def test_raises_processing_when_a_document_is_processing():
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready([{"id": "d1", "status": "processing"}])
    assert _detail(exc_info)["code"] == "PROCESSING"


def test_raises_processing_failed_when_a_document_errored():
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready([{"id": "d1", "status": "error"}])
    assert _detail(exc_info)["code"] == "PROCESSING_FAILED"
    assert _detail(exc_info)["document_id"] == "d1"


def test_raises_diagnostic_required_when_a_document_is_only_processed():
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready([{"id": "d1", "status": "processed"}])
    assert _detail(exc_info)["code"] == "DIAGNOSTIC_REQUIRED"
    assert _detail(exc_info)["document_id"] == "d1"


def test_processing_takes_priority_over_a_mixture_of_other_states():
    documents = [
        {"id": "d1", "status": "error"},
        {"id": "d2", "status": "processing"},
        {"id": "d3", "status": "processed"},
    ]
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready(documents)
    assert _detail(exc_info)["code"] == "PROCESSING"
    assert _detail(exc_info)["document_id"] == "d2"


def test_failed_takes_priority_over_diagnostic_required_once_nothing_is_processing():
    documents = [
        {"id": "d1", "status": "processed"},
        {"id": "d2", "status": "error"},
    ]
    with pytest.raises(HTTPException) as exc_info:
        _raise_practice_not_ready(documents)
    assert _detail(exc_info)["code"] == "PROCESSING_FAILED"
    assert _detail(exc_info)["document_id"] == "d2"


# --- fixtures for the actual endpoints --------------------------------------


def _fake_with_documents(documents: list[dict]) -> FakeAdminClient:
    return FakeAdminClient(tables={"documents": documents})


# --- GET /practice (global) -------------------------------------------------


def test_global_practice_rejects_user_with_no_documents(monkeypatch):
    fake = _fake_with_documents([])
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_global_practice(user_id="u1")
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "NO_DOCUMENTS"


def test_global_practice_rejects_when_only_document_is_still_processing(monkeypatch):
    fake = _fake_with_documents(
        [{"id": "d1", "user_id": "u1", "status": "processing"}]
    )
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_global_practice(user_id="u1")
    assert exc_info.value.detail["code"] == "PROCESSING"
    assert exc_info.value.detail["document_id"] == "d1"


def test_global_practice_rejects_when_only_document_failed(monkeypatch):
    fake = _fake_with_documents([{"id": "d1", "user_id": "u1", "status": "error"}])
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_global_practice(user_id="u1")
    assert exc_info.value.detail["code"] == "PROCESSING_FAILED"


def test_global_practice_rejects_when_document_processed_but_no_diagnostic_yet(
    monkeypatch,
):
    fake = _fake_with_documents([{"id": "d1", "user_id": "u1", "status": "processed"}])
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_global_practice(user_id="u1")
    assert exc_info.value.detail["code"] == "DIAGNOSTIC_REQUIRED"
    assert exc_info.value.detail["document_id"] == "d1"


def test_global_practice_ignores_processing_documents_once_one_is_ready(monkeypatch):
    """A mixture of ready and still-processing documents must not block
    practice on the ready one - only the ready document's concepts should
    be used."""
    fake = FakeAdminClient(
        tables={
            "documents": [
                {
                    "id": "ready-doc",
                    "user_id": "u1",
                    "status": "quiz_ready",
                    "filename": "ready.pdf",
                },
                {
                    "id": "processing-doc",
                    "user_id": "u1",
                    "status": "processing",
                    "filename": "processing.pdf",
                },
            ],
            "concepts": [
                {
                    "id": "c1",
                    "name": "Weight decay",
                    "document_id": "ready-doc",
                    "user_id": "u1",
                },
                {
                    "id": "c-stale",
                    "name": "Should be excluded",
                    "document_id": "processing-doc",
                    "user_id": "u1",
                },
            ],
            "concept_mastery": [{"concept_id": "c1", "mastery_score": 0}],
            "document_chunks": [
                {"document_id": "ready-doc", "chunk_index": 0, "content": "material"}
            ],
        }
    )
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    class FakeCompletionMessage:
        content = (
            '{"questions": [{"concept_name": "Weight decay", '
            '"question": "q", "options": ["a", "b"], "correct_index": 0}]}'
        )

    class FakeCompletion:
        choices = [type("Choice", (), {"message": FakeCompletionMessage})()]

    class FakeGroqClient:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    return FakeCompletion()

    monkeypatch.setattr(quiz, "get_groq_client", lambda: FakeGroqClient())

    result = generate_global_practice(user_id="u1")
    assert len(result["questions"]) == 1
    assert result["questions"][0]["concept_name"] == "Weight decay"


# --- POST /documents/{id}/practice (per-document) ---------------------------


def test_per_document_practice_rejects_a_document_that_is_only_processed(
    monkeypatch,
):
    fake = FakeAdminClient(
        tables={"documents": [{"id": "d1", "user_id": "u1", "status": "processed"}]}
    )
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_practice("d1", user_id="u1")
    assert exc_info.value.detail["code"] == "DIAGNOSTIC_REQUIRED"


def test_per_document_practice_rejects_another_users_document(monkeypatch):
    fake = FakeAdminClient(
        tables={
            "documents": [{"id": "d1", "user_id": "owner", "status": "quiz_ready"}]
        }
    )
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_practice("d1", user_id="someone-else")
    assert exc_info.value.status_code == 403


def test_per_document_practice_404s_for_unknown_document(monkeypatch):
    fake = FakeAdminClient(tables={"documents": []})
    monkeypatch.setattr(quiz, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        generate_practice("no-such-doc", user_id="u1")
    assert exc_info.value.status_code == 404
