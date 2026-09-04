import pytest

from app.quiz import _require_keys, _validate_quiz_item


def test_require_keys_passes_when_all_present():
    _require_keys({"a": 1, "b": 2}, ("a", "b"))


def test_require_keys_raises_on_missing_field():
    with pytest.raises(ValueError, match="b"):
        _require_keys({"a": 1}, ("a", "b"))


def test_validate_quiz_item_passes_for_well_formed_item():
    _validate_quiz_item(
        {"question": "q", "options": ["a", "b"], "correct_index": 1},
        ("question", "options", "correct_index"),
    )


def test_validate_quiz_item_raises_on_missing_field():
    with pytest.raises(ValueError):
        _validate_quiz_item(
            {"question": "q", "options": ["a", "b"]},
            ("question", "options", "correct_index"),
        )


def test_validate_quiz_item_raises_on_non_list_options():
    with pytest.raises(ValueError):
        _validate_quiz_item(
            {"question": "q", "options": "not a list", "correct_index": 0},
            ("question", "options", "correct_index"),
        )


def test_validate_quiz_item_raises_on_empty_options():
    with pytest.raises(ValueError):
        _validate_quiz_item(
            {"question": "q", "options": [], "correct_index": 0},
            ("question", "options", "correct_index"),
        )


def test_validate_quiz_item_raises_on_out_of_range_correct_index():
    with pytest.raises(ValueError):
        _validate_quiz_item(
            {"question": "q", "options": ["a", "b"], "correct_index": 5},
            ("question", "options", "correct_index"),
        )


def test_validate_quiz_item_raises_on_non_int_correct_index():
    with pytest.raises(ValueError):
        _validate_quiz_item(
            {"question": "q", "options": ["a", "b"], "correct_index": "0"},
            ("question", "options", "correct_index"),
        )
