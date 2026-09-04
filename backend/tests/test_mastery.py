from app.quiz import _compute_mastery_score, _response_points


def test_no_answers_yet_is_zero():
    assert _compute_mastery_score([]) == 0


def test_all_correct_no_confidence_is_100():
    responses = [{"is_correct": True, "confidence": None}] * 3
    assert _compute_mastery_score(responses) == 100


def test_all_wrong_no_confidence_is_zero():
    responses = [{"is_correct": False, "confidence": None}] * 3
    assert _compute_mastery_score(responses) == 0


def test_mixed_no_confidence_averages():
    responses = [
        {"is_correct": True, "confidence": None},
        {"is_correct": False, "confidence": None},
    ]
    assert _compute_mastery_score(responses) == 50


def test_confident_correct_scores_higher_than_unsure_correct():
    unsure = _response_points(True, 1)
    confident = _response_points(True, 5)
    assert confident > unsure


def test_confident_wrong_scores_lower_than_unsure_wrong():
    unsure = _response_points(False, 1)
    confident = _response_points(False, 5)
    assert confident < unsure


def test_confident_correct_answer_end_to_end():
    # 1 correct at max confidence -> 50 + 10*5 = 100
    assert _compute_mastery_score([{"is_correct": True, "confidence": 5}]) == 100


def test_confident_wrong_answer_end_to_end():
    # 1 wrong at max confidence -> 50 - 10*5 = 0
    assert _compute_mastery_score([{"is_correct": False, "confidence": 5}]) == 0


def test_score_is_clamped_to_0_100_range():
    # Sanity check the clamp even though current point formula can't
    # actually exceed the range - guards against a future formula change.
    responses = [{"is_correct": True, "confidence": 5}] * 5
    score = _compute_mastery_score(responses)
    assert 0 <= score <= 100


def test_confidence_weighted_mixed_example():
    # 1 correct + 4 incorrect, all at confidence 3, should produce 32%.
    responses = [{"is_correct": True, "confidence": 3}] + [
        {"is_correct": False, "confidence": 3}
    ] * 4
    assert _compute_mastery_score(responses) == 32
