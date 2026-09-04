from app.quiz import _mastery_history_points


def test_no_responses_yields_no_points():
    assert _mastery_history_points([]) == []


def test_single_day_all_correct_yields_one_point_at_100():
    responses = [
        {"answered_at": "2026-08-20T10:00:00Z", "is_correct": True, "confidence": None},
        {"answered_at": "2026-08-20T11:00:00Z", "is_correct": True, "confidence": None},
    ]
    points = _mastery_history_points(responses)
    assert points == [{"date": "2026-08-20", "mastery_score": 100}]


def test_single_day_all_wrong_yields_one_point_at_zero():
    responses = [
        {"answered_at": "2026-08-20T10:00:00Z", "is_correct": False, "confidence": None},
    ]
    assert _mastery_history_points(responses) == [
        {"date": "2026-08-20", "mastery_score": 0}
    ]


def test_score_is_cumulative_across_days_not_per_day():
    responses = [
        {"answered_at": "2026-08-20T10:00:00Z", "is_correct": True, "confidence": None},
        {"answered_at": "2026-08-21T10:00:00Z", "is_correct": False, "confidence": None},
    ]
    points = _mastery_history_points(responses)
    # Day 1: just the correct answer -> 100%. Day 2: correct + wrong -> 50%
    # (cumulative over everything seen so far, not just that day's answers).
    assert points == [
        {"date": "2026-08-20", "mastery_score": 100},
        {"date": "2026-08-21", "mastery_score": 50},
    ]


def test_points_are_sorted_by_date_regardless_of_input_order():
    responses = [
        {"answered_at": "2026-08-22T10:00:00Z", "is_correct": True, "confidence": None},
        {"answered_at": "2026-08-20T10:00:00Z", "is_correct": True, "confidence": None},
        {"answered_at": "2026-08-21T10:00:00Z", "is_correct": True, "confidence": None},
    ]
    points = _mastery_history_points(responses)
    assert [p["date"] for p in points] == ["2026-08-20", "2026-08-21", "2026-08-22"]


def test_multiple_responses_same_day_produce_a_single_point():
    responses = [
        {"answered_at": "2026-08-20T09:00:00Z", "is_correct": True, "confidence": None},
        {"answered_at": "2026-08-20T15:00:00Z", "is_correct": False, "confidence": None},
        {"answered_at": "2026-08-20T20:00:00Z", "is_correct": True, "confidence": None},
    ]
    points = _mastery_history_points(responses)
    assert len(points) == 1
    assert points[0]["date"] == "2026-08-20"
