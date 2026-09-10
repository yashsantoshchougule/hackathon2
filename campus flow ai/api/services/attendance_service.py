"""Pure, deterministic attendance calculations for the FastAPI service layer."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil, floor
from typing import Literal

Risk = Literal["safe", "warning", "critical", "unknown"]


@dataclass(frozen=True)
class AttendanceCalculation:
    percentage: float | None
    risk: Risk
    recovery_classes: int | None
    safe_misses: int | None


def _validate(attended: int, held: int, minimum: float | None) -> None:
    if attended < 0 or held < 0 or attended > held:
        raise ValueError("attendance values must satisfy 0 <= attended <= held")
    if minimum is not None and not 0 <= minimum <= 100:
        raise ValueError("minimum attendance must be between 0 and 100")


def percentage(attended: int, held: int) -> float | None:
    """Return null-equivalent for no classes rather than a misleading 0%."""
    _validate(attended, held, None)
    return None if held == 0 else attended / held * 100


def risk_for(current: float | None, minimum: float | None, warning_buffer: float = 5) -> Risk:
    if current is None or minimum is None:
        return "unknown"
    if current < minimum:
        return "critical"
    if current < minimum + warning_buffer:
        return "warning"
    return "safe"


def after_future_classes(attended: int, held: int, future_classes: int, action: Literal["attend", "miss"]) -> float | None:
    _validate(attended, held, None)
    if future_classes < 0:
        raise ValueError("future classes cannot be negative")
    return percentage(attended + future_classes if action == "attend" else attended, held + future_classes)


def classes_to_recover(attended: int, held: int, minimum: float | None) -> int | None:
    _validate(attended, held, minimum)
    if minimum is None:
        return None
    target = minimum / 100
    current = percentage(attended, held)
    if target == 0 or (current is not None and current >= minimum):
        return 0
    if target == 1:
        # A prior absence means 100% cannot be reached by attending finite future classes.
        return 0 if attended == held else None
    return max(0, ceil((target * held - attended) / (1 - target)))


def safe_misses(attended: int, held: int, minimum: float | None) -> int | None:
    _validate(attended, held, minimum)
    if minimum is None:
        return None
    target = minimum / 100
    if target == 0:
        return None
    return max(0, floor(attended / target - held))


def calculate(attended: int, held: int, minimum: float | None, warning_buffer: float = 5) -> AttendanceCalculation:
    current = percentage(attended, held)
    return AttendanceCalculation(current, risk_for(current, minimum, warning_buffer), classes_to_recover(attended, held, minimum), safe_misses(attended, held, minimum))


def weighted_overall(rows: list[tuple[int, int]]) -> float | None:
    """Compute total attended / total held; never average subject percentages."""
    attended = sum(row[0] for row in rows)
    held = sum(row[1] for row in rows)
    return percentage(attended, held)
