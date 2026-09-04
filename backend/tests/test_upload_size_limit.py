import pytest
from fastapi import HTTPException

from app.transcribe import MAX_AUDIO_BYTES, _enforce_max_size


def test_allows_file_under_the_limit():
    _enforce_max_size(1024, MAX_AUDIO_BYTES)


def test_allows_file_exactly_at_the_limit():
    _enforce_max_size(MAX_AUDIO_BYTES, MAX_AUDIO_BYTES)


def test_rejects_file_over_the_limit():
    with pytest.raises(HTTPException) as exc_info:
        _enforce_max_size(MAX_AUDIO_BYTES + 1, MAX_AUDIO_BYTES)
    assert exc_info.value.status_code == 413
