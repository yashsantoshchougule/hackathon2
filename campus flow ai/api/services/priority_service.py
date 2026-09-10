from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from api.models.ai import AcademicContext, Notification, PriorityLevel, PriorityResult


def _as_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value.astimezone(UTC)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
        except ValueError:
            return None
    return None


class PriorityService:
    """Deterministic academic priority calculations; no model calls occur here."""

    def calculate(self, context: AcademicContext, now: datetime | None = None) -> list[PriorityResult]:
        current = (now or datetime.now(UTC)).astimezone(UTC)
        results: list[PriorityResult] = []
        subject_factors = {
            str(item.get("subject_id")): item for item in context.subjects if item.get("subject_id") is not None
        }
        daily_minutes = self._positive_int((context.study_preferences or {}).get("daily_available_minutes"))
        for assignment in context.assignments:
            if assignment.get("completed") is True or str(assignment.get("status", "")).lower() in {"completed", "submitted"}:
                continue
            deadline = _as_datetime(assignment.get("due_at") or assignment.get("deadline"))
            subject = subject_factors.get(str(assignment.get("subject_id")), {})
            score, reasons = self._assignment_score(assignment, deadline, current)
            source_data = ["assignment_status", "verified_deadline"]
            if assignment.get("estimated_minutes") is not None:
                source_data.append("estimated_duration")
            if subject.get("is_weak") is True:
                score += 8
                reasons.append("The subject is marked as a weaker area")
                source_data.append("subject_strength")
            difficulty = str(subject.get("difficulty") or "").lower()
            if difficulty in {"hard", "high", "difficult"}:
                score += 7
                reasons.append("The subject difficulty is marked high")
                source_data.append("subject_difficulty")
            estimated = self._positive_int(assignment.get("estimated_minutes"))
            if daily_minutes and estimated and estimated > daily_minutes:
                score += 5
                reasons.append("The estimated work exceeds one day of available study time")
                source_data.append("available_study_time")
            score = min(100, score)
            priority = self._level(score)
            task_id = str(assignment.get("id", ""))
            title = str(assignment.get("title") or "Untitled assignment")
            warning = None if deadline else "A verified deadline is missing."
            results.append(
                PriorityResult(
                    task_id=task_id,
                    title=title,
                    recommended_action=f"Work on {title}",
                    priority=priority,
                    score=score,
                    reason="; ".join(reasons),
                    source_data_considered=source_data,
                    deadline=deadline,
                    estimated_minutes=estimated,
                    consequence_of_delay=(
                        "The verified deadline has passed." if deadline and deadline < current
                        else "Less preparation time will remain before the verified deadline."
                    ),
                    missing_data_warning=warning,
                    route=f"/assignments/{task_id}",
                )
            )

        for attendance in context.attendance:
            # The attendance module owns these values; the AI layer only consumes its validated summary.
            percentage = self._number(attendance.get("percentage"))
            minimum = self._number(attendance.get("minimum_percentage"))
            if percentage is None or minimum is None or percentage >= minimum:
                continue
            shortage = minimum - percentage
            score = min(95, 65 + int(shortage * 2))
            subject_id = str(attendance.get("subject_id") or attendance.get("id") or "attendance")
            classes = self._positive_int(attendance.get("classes_required"))
            results.append(
                PriorityResult(
                    task_id=f"attendance:{subject_id}",
                    title="Recover attendance",
                    recommended_action="Review the verified attendance recovery guidance.",
                    priority=self._level(score),
                    score=score,
                    reason=f"Verified attendance is {percentage:g}%, below the {minimum:g}% requirement.",
                    source_data_considered=["validated_attendance_summary"],
                    estimated_minutes=None,
                    consequence_of_delay="The attendance shortage may increase if upcoming classes are missed.",
                    missing_data_warning=None if classes is not None else "Classes required was not supplied by the attendance service.",
                    route="/attendance",
                )
            )

        for examination in context.examinations:
            starts_at = _as_datetime(examination.get("starts_at") or examination.get("exam_date"))
            if starts_at is None or starts_at <= current:
                continue
            hours = (starts_at - current).total_seconds() / 3600
            if hours <= 24:
                score, reason = 85, "The verified examination starts within 24 hours."
            elif hours <= 72:
                score, reason = 70, "The verified examination starts within three days."
            elif hours <= 168:
                score, reason = 55, "The verified examination is this week."
            else:
                score, reason = 30, "The verified examination is more than a week away."
            examination_id = str(examination.get("id") or "")
            results.append(
                PriorityResult(
                    task_id=f"exam:{examination_id}",
                    title=f"Prepare for {examination.get('title') or 'examination'}",
                    recommended_action=f"Review for {examination.get('title') or 'the upcoming examination'}",
                    priority=self._level(score),
                    score=score,
                    reason=reason,
                    source_data_considered=["verified_examination_time"],
                    deadline=starts_at,
                    estimated_minutes=60,
                    consequence_of_delay="Less preparation time will remain before the examination.",
                    route="/examinations",
                )
            )
        return sorted(results, key=lambda item: (-item.score, item.deadline or datetime.max.replace(tzinfo=UTC)))

    @staticmethod
    def notifications(results: list[PriorityResult]) -> list[Notification]:
        notifications: list[Notification] = []
        for item in results:
            if item.priority not in {PriorityLevel.critical, PriorityLevel.high}:
                continue
            source_id = item.task_id.removeprefix("exam:").removeprefix("attendance:")
            notifications.append(
                Notification(
                    notification_type=(
                        "attendance" if item.route == "/attendance"
                        else "deadline" if item.deadline is not None
                        else "academic_risk"
                    ),
                    source_entity_id=source_id,
                    message=item.recommended_action,
                    severity=item.priority,
                    destination_route=item.route,
                )
            )
        return notifications

    @staticmethod
    def _assignment_score(assignment: dict[str, Any], deadline: datetime | None, now: datetime) -> tuple[int, list[str]]:
        score = 20
        reasons: list[str] = []
        if deadline is None:
            reasons.append("No verified deadline is available")
        else:
            hours = (deadline - now).total_seconds() / 3600
            if hours < 0:
                score += 70
                reasons.append("The assignment is overdue")
            elif hours <= 24:
                score += 60
                reasons.append("The deadline is within 24 hours")
            elif hours <= 72:
                score += 45
                reasons.append("The deadline is within three days")
            elif hours <= 168:
                score += 30
                reasons.append("The deadline is this week")
            else:
                reasons.append("The deadline is more than a week away")
        duration = PriorityService._positive_int(assignment.get("estimated_minutes"))
        if duration and duration >= 180:
            score += 10
            reasons.append("The estimated workload is substantial")
        return min(100, score), reasons

    @staticmethod
    def _level(score: int) -> PriorityLevel:
        if score >= 85:
            return PriorityLevel.critical
        if score >= 65:
            return PriorityLevel.high
        if score >= 40:
            return PriorityLevel.medium
        return PriorityLevel.low

    @staticmethod
    def _number(value: Any) -> float | None:
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _positive_int(value: Any) -> int | None:
        try:
            parsed = int(value)
            return parsed if parsed >= 0 else None
        except (TypeError, ValueError):
            return None
