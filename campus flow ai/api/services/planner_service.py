from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta, tzinfo
from typing import Any
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from api.core.errors import AppError
from api.core.supabase_client import SupabaseClient
from api.models.ai import AcademicContext, PlanGenerateRequest, PlanItem, PriorityResult, StudyPlan
from api.services.priority_service import PriorityService, _as_datetime


class PlannerService:
    def __init__(self, client: SupabaseClient | None = None) -> None:
        self.client = client
        self.priorities = PriorityService()

    async def generate(
        self,
        student_id: str,
        context: AcademicContext,
        request: PlanGenerateRequest,
        *,
        now: datetime | None = None,
        persist: bool = True,
    ) -> StudyPlan:
        current = (now or datetime.now(UTC)).astimezone(UTC)
        start_date = request.date_from or current.date()
        end_date = request.date_to or (start_date + timedelta(days=6))
        if start_date < current.date():
            start_date = current.date()
        if end_date < start_date or (end_date - start_date).days > 14:
            raise AppError(422, "INVALID_PLAN_RANGE", "Choose a plan range between one and fourteen days.")

        completed = [item for item in context.plan_items if item.get("completed") is True]
        tasks = self.priorities.calculate(context, current)
        if request.recovery_mode:
            tasks = self._recovery_tasks(context, tasks, current)

        windows = self._available_windows(context, start_date, end_date, current)
        attendance_risks = [task for task in tasks if task.task_id.startswith("attendance:")]
        study_tasks = [task for task in tasks if not task.task_id.startswith("attendance:")]
        preferences = context.study_preferences or {}
        max_session = self._integer(preferences.get("average_session_minutes"), 45)
        break_minutes = self._nonnegative_integer(preferences.get("break_minutes"), 10)
        items, warnings = self._schedule(
            study_tasks,
            windows,
            max_session=max_session,
            break_minutes=break_minutes,
            subject_labels=self._subject_labels(context),
        )
        if attendance_risks:
            warnings.append("Attendance risks are shown separately and are not treated as study sessions.")
        preserved = self._preserved_items(completed)
        if completed:
            warnings.append("Completed study items were preserved and were not rescheduled.")
        if not study_tasks:
            warnings.append("No pending work with verified source data was found.")

        plan = StudyPlan(
            id=uuid4(),
            status="pending_confirmation",
            date_from=start_date,
            date_to=end_date,
            items=sorted([*preserved, *items], key=lambda item: item.starts_at),
            warnings=list(dict.fromkeys([*context.missing_data_warnings, *warnings])),
            explanation=(
                "This recovery proposal reschedules incomplete work around verified commitments."
                if request.recovery_mode
                else "This proposal schedules higher-priority work first around verified commitments."
            ),
            recovery_mode=request.recovery_mode,
            created_at=current,
        )
        if persist:
            await self._persist(student_id, plan)
        return plan

    async def current(self, student_id: str) -> StudyPlan | None:
        if self.client is None:
            return None
        rows = await self.client.select(
            "study_plans",
            filters={"student_id": f"eq.{student_id}", "status": "in.(pending_confirmation,confirmed)"},
            order="created_at.desc",
            limit=1,
        )
        if not rows:
            return None
        plan_row = rows[0]
        items = await self.client.select(
            "study_plan_items",
            filters={"student_id": f"eq.{student_id}", "plan_id": f"eq.{plan_row['id']}"},
            order="starts_at.asc",
        )
        return self._from_rows(plan_row, items)

    async def set_status(self, student_id: str, plan_id: UUID, status: str) -> StudyPlan:
        if status not in {"confirmed", "rejected"}:
            raise ValueError("Unsupported plan status")
        if self.client is None:
            raise AppError(503, "PLANNER_STORAGE_UNAVAILABLE", "Study-plan storage is unavailable.")
        existing = await self.client.select(
            "study_plans",
            filters={"student_id": f"eq.{student_id}", "id": f"eq.{plan_id}"},
            limit=1,
        )
        if not existing:
            raise AppError(404, "PLAN_NOT_FOUND", "The study plan was not found.")
        if existing[0].get("status") != "pending_confirmation":
            raise AppError(409, "PLAN_ALREADY_REVIEWED", "This study plan has already been reviewed.")
        rows = await self.client.update(
            "study_plans",
            {"status": status, "reviewed_at": datetime.now(UTC).isoformat()},
            filters={"student_id": f"eq.{student_id}", "id": f"eq.{plan_id}"},
        )
        items = await self.client.select(
            "study_plan_items",
            filters={"student_id": f"eq.{student_id}", "plan_id": f"eq.{plan_id}"},
            order="starts_at.asc",
        )
        return self._from_rows(rows[0], items)

    async def _persist(self, student_id: str, plan: StudyPlan) -> None:
        if self.client is None:
            raise AppError(503, "PLANNER_STORAGE_UNAVAILABLE", "Study-plan storage is unavailable.")
        await self.client.insert(
            "study_plans",
            {
                "id": str(plan.id),
                "student_id": student_id,
                "status": plan.status,
                "date_from": plan.date_from.isoformat(),
                "date_to": plan.date_to.isoformat(),
                "explanation": plan.explanation,
                "recovery_mode": plan.recovery_mode,
                "warnings": plan.warnings,
                "created_at": plan.created_at.isoformat(),
            },
        )
        if plan.items:
            await self.client.insert(
                "study_plan_items",
                [
                    {
                        **item.model_dump(mode="json"),
                        "id": str(item.id),
                        "plan_id": str(plan.id),
                        "student_id": student_id,
                        "priority": item.priority.value,
                    }
                    for item in plan.items
                ],
            )

    def _available_windows(
        self,
        context: AcademicContext,
        start_date: date,
        end_date: date,
        now: datetime,
    ) -> list[tuple[datetime, datetime]]:
        preferences = context.study_preferences or {}
        tz = self._timezone(context.timezone)
        start_time = self._time(preferences.get("preferred_study_start"), time(18, 0))
        end_time = self._time(preferences.get("preferred_study_end"), time(21, 0))
        daily_minutes = self._integer(preferences.get("daily_available_minutes"), 180)
        busy: list[tuple[datetime, datetime]] = []
        for row in [*context.timetable, *context.examinations]:
            starts = _as_datetime(row.get("starts_at") or row.get("exam_date"))
            ends = _as_datetime(row.get("ends_at"))
            if starts:
                busy.append((starts, ends or starts + timedelta(hours=2)))
        for row in context.plan_items:
            if row.get("completed") is True:
                continue
            starts = _as_datetime(row.get("starts_at"))
            ends = _as_datetime(row.get("ends_at"))
            if starts and ends and ends > now:
                busy.append((starts, ends))

        windows: list[tuple[datetime, datetime]] = []
        day = start_date
        while day <= end_date:
            local_start = datetime.combine(day, start_time, tzinfo=tz)
            local_end = datetime.combine(day, end_time, tzinfo=tz)
            cap = local_start + timedelta(minutes=daily_minutes)
            local_end = min(local_end, cap)
            start = max(local_start.astimezone(UTC), now)
            end = local_end.astimezone(UTC)
            if end > start:
                windows.extend(self._subtract_busy((start, end), busy))
            day += timedelta(days=1)
        return windows

    @staticmethod
    def _subtract_busy(
        window: tuple[datetime, datetime], busy: list[tuple[datetime, datetime]]
    ) -> list[tuple[datetime, datetime]]:
        segments = [window]
        for busy_start, busy_end in busy:
            next_segments: list[tuple[datetime, datetime]] = []
            for start, end in segments:
                if busy_end <= start or busy_start >= end:
                    next_segments.append((start, end))
                    continue
                if busy_start > start:
                    next_segments.append((start, busy_start))
                if busy_end < end:
                    next_segments.append((busy_end, end))
            segments = next_segments
        return [(start, end) for start, end in segments if (end - start).total_seconds() >= 25 * 60]

    def _schedule(
        self,
        priorities: list[PriorityResult],
        windows: list[tuple[datetime, datetime]],
        *,
        max_session: int,
        break_minutes: int,
        subject_labels: dict[str, str],
    ) -> tuple[list[PlanItem], list[str]]:
        items: list[PlanItem] = []
        warnings: list[str] = []
        cursor_windows = [[start, end] for start, end in windows]
        for task in priorities:
            remaining = task.estimated_minutes or 45
            scheduled = 0
            for window in cursor_windows:
                if remaining <= 0:
                    break
                start, end = window
                available = int((end - start).total_seconds() // 60)
                if available < 25:
                    continue
                session = min(remaining, available, max_session)
                session_end = start + timedelta(minutes=session)
                if task.deadline and session_end > task.deadline:
                    session_end = task.deadline
                    session = int((session_end - start).total_seconds() // 60)
                if session < 25:
                    continue
                items.append(
                    PlanItem(
                        id=uuid4(),
                        source_type=(
                            "examination" if task.task_id.startswith("exam:")
                            else "general" if task.task_id.startswith("attendance:")
                            else "assignment"
                        ),
                        source_id=task.task_id.removeprefix("exam:"),
                        title=task.title,
                        subject=subject_labels.get(task.task_id),
                        starts_at=start,
                        ends_at=session_end,
                        priority=task.priority,
                        reason=task.reason,
                    )
                )
                applied_break = break_minutes if session >= 60 and session_end + timedelta(minutes=break_minutes) < end else 0
                window[0] = session_end + timedelta(minutes=applied_break)
                remaining -= session
                scheduled += session
            if remaining > 0:
                warnings.append(f"Only {scheduled} of {task.estimated_minutes or 45} minutes could be scheduled for {task.title}.")
        return items, warnings

    @staticmethod
    def _recovery_tasks(
        context: AcademicContext, priorities: list[PriorityResult], now: datetime
    ) -> list[PriorityResult]:
        incomplete_ids = {
            str(item.get("source_id"))
            for item in context.plan_items
            if item.get("completed") is not True and _as_datetime(item.get("ends_at")) and _as_datetime(item.get("ends_at")) < now
        }
        if not incomplete_ids:
            return priorities
        recovered = [item.model_copy(update={"score": min(100, item.score + 10)}) for item in priorities if item.task_id in incomplete_ids]
        untouched = [item for item in priorities if item.task_id not in incomplete_ids]
        return sorted([*recovered, *untouched], key=lambda item: -item.score)

    @staticmethod
    def _preserved_items(rows: list[dict[str, Any]]) -> list[PlanItem]:
        preserved: list[PlanItem] = []
        for row in rows:
            try:
                preserved.append(
                    PlanItem(
                        id=row["id"],
                        source_type=row.get("source_type") or "general",
                        source_id=str(row["source_id"]) if row.get("source_id") else None,
                        title=row["title"],
                        subject=row.get("subject"),
                        starts_at=row["starts_at"],
                        ends_at=row["ends_at"],
                        priority=row.get("priority") or "low",
                        reason=row.get("reason") or "Completed item preserved from the current plan.",
                        completed=True,
                    )
                )
            except (KeyError, ValueError, TypeError):
                continue
        return preserved

    @staticmethod
    def _subject_labels(context: AcademicContext) -> dict[str, str]:
        names: dict[str, str] = {}
        for enrollment in context.subjects:
            subject_id = enrollment.get("subject_id")
            nested = enrollment.get("subjects")
            if subject_id is None:
                continue
            if isinstance(nested, dict):
                names[str(subject_id)] = str(nested.get("name") or nested.get("title") or nested.get("code") or subject_id)
            else:
                names[str(subject_id)] = str(subject_id)
        labels: dict[str, str] = {}
        for assignment in context.assignments:
            if assignment.get("id") is not None and assignment.get("subject_id") is not None:
                labels[str(assignment["id"])] = names.get(str(assignment["subject_id"]), str(assignment["subject_id"]))
        for examination in context.examinations:
            if examination.get("id") is not None and examination.get("subject_id") is not None:
                labels[f"exam:{examination['id']}"] = names.get(
                    str(examination["subject_id"]), str(examination["subject_id"])
                )
        return labels

    @staticmethod
    def _timezone(name: str) -> tzinfo:
        if name.upper() == "UTC":
            return UTC
        try:
            return ZoneInfo(name)
        except ZoneInfoNotFoundError:
            return UTC

    @staticmethod
    def _time(value: Any, default: time) -> time:
        if isinstance(value, str):
            try:
                return time.fromisoformat(value)
            except ValueError:
                return default
        return default

    @staticmethod
    def _integer(value: Any, default: int) -> int:
        try:
            return max(25, int(value))
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _nonnegative_integer(value: Any, default: int) -> int:
        try:
            return max(0, int(value))
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _from_rows(plan: dict[str, Any], items: list[dict[str, Any]]) -> StudyPlan:
        allowed_item_fields = {
            "id", "source_type", "source_id", "title", "subject", "starts_at", "ends_at",
            "priority", "reason", "completed",
        }
        return StudyPlan(
            id=plan["id"],
            status=plan["status"],
            date_from=plan["date_from"],
            date_to=plan["date_to"],
            items=[{key: value for key, value in item.items() if key in allowed_item_fields} for item in items],
            warnings=plan.get("warnings") or [],
            explanation=plan.get("explanation") or "",
            recovery_mode=bool(plan.get("recovery_mode")),
            created_at=plan["created_at"],
        )
