from app import flashcards
from app.flashcards import generate_flashcards
from conftest import FakeAdminClient


def _fake():
    return FakeAdminClient(
        tables={
            "documents": [{"id": "d1", "user_id": "u1", "status": "quiz_ready"}],
            "concepts": [
                {"id": "c-loss", "name": "Loss function", "document_id": "d1"},
                {"id": "c-bias", "name": "Weights and biases", "document_id": "d1"},
            ],
            "document_chunks": [
                {"document_id": "d1", "chunk_index": 0, "content": "material"}
            ],
            "flashcards": [],
        }
    )


def _groq(monkeypatch, content):
    prompts = []

    class Message:
        pass

    Message.content = content

    class Completion:
        choices = [type("Choice", (), {"message": Message})()]

    class Client:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    prompts.append(kwargs["messages"][0]["content"])
                    return Completion()

    monkeypatch.setattr(flashcards, "get_groq_client", lambda: Client())
    return prompts


def test_cards_get_their_concept_even_when_the_name_differs_in_case(monkeypatch):
    fake = _fake()
    monkeypatch.setattr(flashcards, "get_admin_client", lambda: fake)
    prompts = _groq(
        monkeypatch,
        '{"cards": ['
        '{"concept_name": "Loss Function", "front": "f1", "back": "b1"},'
        '{"concept_name": " weights  and BIASES ", "front": "f2", "back": "b2"},'
        '{"concept_name": "Something else", "front": "f3", "back": "b3"}]}',
    )

    generate_flashcards("d1", user_id="u1")

    by_front = {c["front"]: c["concept_id"] for c in fake._tables["flashcards"]}
    assert by_front == {"f1": "c-loss", "f2": "c-bias", "f3": None}
    # The model is told the exact concept names to use.
    assert "Loss function, Weights and biases" in prompts[0]
