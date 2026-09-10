from datetime import datetime, timezone

from api.services.conflict_service import TimeInterval, detect_conflicts, overlaps


def item(identifier: str, start: int, end: int) -> TimeInterval:
    return TimeInterval(identifier, datetime(2026, 9, 10, start, tzinfo=timezone.utc), datetime(2026, 9, 10, end, tzinfo=timezone.utc))


def test_interval_overlap_is_deterministic():
    assert overlaps(item("a", 9, 10), item("b", 9, 11))
    assert not overlaps(item("a", 9, 10), item("b", 10, 11))
    assert detect_conflicts([item("a", 9, 11), item("b", 10, 12), item("c", 12, 13)]) == [("a", "b")]
