"""Timezone-aware interval conflict detection. AI is never involved."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class TimeInterval:
    entry_id: str
    starts_at: datetime
    ends_at: datetime

    def validate(self) -> None:
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("timetable intervals must include a timezone")
        if self.ends_at <= self.starts_at:
            raise ValueError("entry end must be after its start")


def overlaps(first: TimeInterval, second: TimeInterval) -> bool:
    first.validate()
    second.validate()
    return first.starts_at < second.ends_at and second.starts_at < first.ends_at


def detect_conflicts(entries: list[TimeInterval]) -> list[tuple[str, str]]:
    valid = sorted(entries, key=lambda entry: entry.starts_at)
    for entry in valid:
        entry.validate()
    conflicts: list[tuple[str, str]] = []
    for index, entry in enumerate(valid):
        for candidate in valid[index + 1:]:
            if candidate.starts_at >= entry.ends_at:
                break
            if overlaps(entry, candidate):
                conflicts.append((entry.entry_id, candidate.entry_id))
    return conflicts
