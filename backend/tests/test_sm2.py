from app.flashcards import _compute_sm2

INITIAL_EASE = 2.5


def test_first_review_good_sets_one_day_interval():
    interval, ease, reps = _compute_sm2(
        quality=4, ease_factor=INITIAL_EASE, repetitions=0, interval_days=0
    )
    assert interval == 1
    assert reps == 1


def test_second_review_good_sets_six_day_interval():
    interval, ease, reps = _compute_sm2(
        quality=4, ease_factor=INITIAL_EASE, repetitions=1, interval_days=1
    )
    assert interval == 6
    assert reps == 2


def test_third_review_good_multiplies_interval_by_ease_factor():
    interval, ease, reps = _compute_sm2(
        quality=4, ease_factor=2.5, repetitions=2, interval_days=6
    )
    assert interval == round(6 * 2.5)
    assert reps == 3


def test_again_resets_repetitions_and_interval():
    interval, ease, reps = _compute_sm2(
        quality=2, ease_factor=2.5, repetitions=5, interval_days=40
    )
    assert reps == 0
    assert interval == 1


def test_again_never_drops_ease_factor_below_floor():
    _, ease, _ = _compute_sm2(
        quality=2, ease_factor=1.3, repetitions=3, interval_days=10
    )
    assert ease == 1.3


def test_repeated_again_ratings_keep_ease_at_floor():
    ease = INITIAL_EASE
    interval, reps = 0, 0
    for _ in range(10):
        interval, ease, reps = _compute_sm2(2, ease, reps, interval)
    assert ease == 1.3
    assert reps == 0
    assert interval == 1


def test_easy_increases_ease_factor_more_than_good():
    _, ease_good, _ = _compute_sm2(
        quality=4, ease_factor=INITIAL_EASE, repetitions=2, interval_days=6
    )
    _, ease_easy, _ = _compute_sm2(
        quality=5, ease_factor=INITIAL_EASE, repetitions=2, interval_days=6
    )
    assert ease_easy > ease_good


def test_all_easy_grows_interval_and_ease_over_repeated_reviews():
    ease, interval, reps = INITIAL_EASE, 0, 0
    for _ in range(4):
        interval, ease, reps = _compute_sm2(5, ease, reps, interval)
    assert reps == 4
    assert interval > 6
    assert ease > INITIAL_EASE
