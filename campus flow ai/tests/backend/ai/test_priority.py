from datetime import UTC, datetime, timedelta

from api.models.ai import AcademicContext, PriorityLevel
from api.services.priority_service import PriorityService


def test_overdue_assignment_is_critical(academic_context: AcademicContext) -> None:
    now = datetime(2026, 9, 10, 10, tzinfo=UTC)
    academic_context.assignments[0]["due_at"] = (now - timedelta(hours=1)).isoformat()
    result = PriorityService().calculate(academic_context, now)
    assignment = next(item for item in result if item.task_id == "assignment-1")
    assert assignment.priority is PriorityLevel.critical
    assert "overdue" in assignment.reason.lower()


def test_completed_assignment_is_excluded(academic_context: AcademicContext) -> None:
    academic_context.assignments[0]["completed"] = True
    result = PriorityService().calculate(academic_context)
    assert all(item.task_id != "assignment-1" for item in result)


def test_attendance_values_are_consumed_not_recalculated(academic_context: AcademicContext) -> None:
    result = PriorityService().calculate(academic_context)
    attendance = next(item for item in result if item.task_id.startswith("attendance:"))
    assert "73%" in attendance.reason
    assert "75%" in attendance.reason
    assert attendance.source_data_considered == ["validated_attendance_summary"]


def test_missing_deadline_is_reported() -> None:
    now = datetime(2026, 9, 10, 10, tzinfo=UTC)
    context = AcademicContext(
        student_id="student-a", date_from=now, date_to=now + timedelta(days=1),
        assignments=[{"id": "a", "title": "Unscheduled", "completed": False}],
    )
    item = PriorityService().calculate(context, now)[0]
    assert item.missing_data_warning == "A verified deadline is missing."


def test_upcoming_exam_is_prioritized_from_verified_time(academic_context: AcademicContext) -> None:
    now = datetime(2026, 9, 10, 10, tzinfo=UTC)
    academic_context.examinations = [{
        "id": "exam-1", "title": "Networks", "starts_at": (now + timedelta(hours=20)).isoformat()
    }]
    result = PriorityService().calculate(academic_context, now)
    exam = next(item for item in result if item.task_id == "exam:exam-1")
    assert exam.priority is PriorityLevel.critical
    assert exam.source_data_considered == ["verified_examination_time"]


def test_priority_results_map_to_typed_notifications(academic_context: AcademicContext) -> None:
    results = PriorityService().calculate(academic_context, datetime(2026, 9, 10, 10, tzinfo=UTC))
    notifications = PriorityService.notifications(results)
    assert notifications
    assert all(item.destination_route.startswith("/") for item in notifications)
