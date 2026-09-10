from api.services.attendance_service import after_future_classes, calculate, classes_to_recover, percentage, safe_misses, weighted_overall


def test_current_and_future_percentages_are_deterministic():
    assert percentage(18, 24) == 75
    assert after_future_classes(18, 24, 2, "attend") == 20 / 26 * 100
    assert after_future_classes(18, 24, 2, "miss") == 18 / 26 * 100


def test_recovery_and_safe_miss_edges():
    assert classes_to_recover(18, 24, 75) == 0
    assert classes_to_recover(15, 24, 75) == 12
    assert safe_misses(18, 24, 75) == 0
    assert safe_misses(20, 24, 75) == 2
    assert classes_to_recover(5, 10, 100) is None


def test_no_classes_is_not_zero_percent():
    result = calculate(0, 0, 75)
    assert result.percentage is None
    assert result.risk == "unknown"
    assert weighted_overall([(0, 0), (0, 0)]) is None


def test_overall_is_weighted():
    assert weighted_overall([(9, 10), (1, 2)]) == 10 / 12 * 100
