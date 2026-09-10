from datetime import UTC, datetime

import pytest

from api.models.ai import AcademicContext, PlanGenerateRequest
from api.services.planner_service import PlannerService


@pytest.mark.asyncio
async def test_planner_avoids_lecture_conflicts(academic_context: AcademicContext) -> None:
    now = datetime(2026, 9, 10, 10, tzinfo=UTC)
    plan = await PlannerService().generate(
        "student-a", academic_context, PlanGenerateRequest(), now=now, persist=False
    )
    lecture_start = datetime(2026, 9, 10, 18, tzinfo=UTC)
    lecture_end = datetime(2026, 9, 10, 19, tzinfo=UTC)
    assert plan.status == "pending_confirmation"
    assert all(item.ends_at <= lecture_start or item.starts_at >= lecture_end for item in plan.items)
    assert all(not (item.source_id or "").startswith("attendance:") for item in plan.items)


@pytest.mark.asyncio
async def test_planner_never_creates_overlaps(academic_context: AcademicContext) -> None:
    now = datetime(2026, 9, 10, 10, tzinfo=UTC)
    academic_context.assignments.append(
        {
            "id": "assignment-2", "title": "Presentation", "completed": False,
            "due_at": "2026-09-12T12:00:00+00:00", "estimated_minutes": 120,
        }
    )
    plan = await PlannerService().generate(
        "student-a", academic_context, PlanGenerateRequest(), now=now, persist=False
    )
    ordered = sorted(plan.items, key=lambda item: item.starts_at)
    assert all(first.ends_at <= second.starts_at for first, second in zip(ordered, ordered[1:]))


@pytest.mark.asyncio
async def test_recovery_preserves_completed_items(academic_context: AcademicContext) -> None:
    academic_context.plan_items = [{
        "id": "4b4c28ed-84d9-4a5b-b45f-a37f6321c81c", "source_id": "assignment-1",
        "source_type": "assignment", "title": "Completed reading", "completed": True,
        "starts_at": "2026-09-09T18:00:00Z", "ends_at": "2026-09-09T18:45:00Z",
        "priority": "medium", "reason": "Previously completed",
    }]
    plan = await PlannerService().generate(
        "student-a", academic_context, PlanGenerateRequest(recovery_mode=True),
        now=datetime(2026, 9, 10, 10, tzinfo=UTC), persist=False,
    )
    assert plan.recovery_mode is True
    assert any(item.completed and item.title == "Completed reading" for item in plan.items)
    assert any("preserved" in warning for warning in plan.warnings)


class PlanStore:
    def __init__(self) -> None:
        self.filters = None

    async def select(self, table, *, filters, **_kwargs):
        self.filters = filters
        if table == "study_plans":
            return [{
                "id": "93c79d8d-3fc8-4444-ac54-9b611f8624a9", "student_id": "student-a",
                "status": "pending_confirmation", "date_from": "2026-09-10", "date_to": "2026-09-16",
                "explanation": "Plan", "recovery_mode": False, "warnings": [],
                "created_at": "2026-09-10T10:00:00Z",
            }]
        return []

    async def update(self, _table, values, *, filters):
        self.filters = filters
        return [{
            "id": "93c79d8d-3fc8-4444-ac54-9b611f8624a9", "status": values["status"],
            "date_from": "2026-09-10", "date_to": "2026-09-16", "explanation": "Plan",
            "recovery_mode": False, "warnings": [], "created_at": "2026-09-10T10:00:00Z",
        }]


@pytest.mark.asyncio
async def test_confirmation_is_scoped_to_authenticated_student() -> None:
    store = PlanStore()
    plan = await PlannerService(store).set_status(
        "student-a", "93c79d8d-3fc8-4444-ac54-9b611f8624a9", "confirmed"
    )
    assert plan.status == "confirmed"
    assert store.filters["student_id"] == "eq.student-a"


@pytest.mark.asyncio
async def test_planner_uses_student_timezone(academic_context: AcademicContext) -> None:
    academic_context.timezone = "Asia/Kolkata"
    academic_context.study_preferences = {
        "timezone": "Asia/Kolkata", "preferred_study_start": "18:00",
        "preferred_study_end": "20:00", "daily_available_minutes": 120,
    }
    academic_context.timetable = []
    plan = await PlannerService().generate(
        "student-a", academic_context, PlanGenerateRequest(),
        now=datetime(2026, 9, 10, 10, tzinfo=UTC), persist=False,
    )
    first = next(item for item in plan.items if not item.completed)
    assert first.starts_at.hour == 12 and first.starts_at.minute == 30
