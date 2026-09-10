from datetime import UTC, datetime, timedelta

import pytest

from api.models.ai import AcademicContext


@pytest.fixture
def academic_context() -> AcademicContext:
    now = datetime(2026, 9, 10, 10, tzinfo=UTC)
    return AcademicContext(
        student_id="student-a",
        timezone="UTC",
        date_from=now,
        date_to=now + timedelta(days=7),
        assignments=[
            {
                "id": "assignment-1",
                "title": "Database report",
                "due_at": (now + timedelta(hours=20)).isoformat(),
                "completed": False,
                "estimated_minutes": 90,
            }
        ],
        examinations=[],
        timetable=[
            {
                "id": "lecture-1",
                "title": "Database lecture",
                "starts_at": datetime(2026, 9, 10, 18, tzinfo=UTC).isoformat(),
                "ends_at": datetime(2026, 9, 10, 19, tzinfo=UTC).isoformat(),
            }
        ],
        attendance=[
            {
                "id": "attendance-1",
                "subject_id": "subject-1",
                "percentage": 73,
                "minimum_percentage": 75,
                "classes_required": 2,
            }
        ],
        study_preferences={
            "timezone": "UTC",
            "preferred_study_start": "18:00",
            "preferred_study_end": "21:00",
            "daily_available_minutes": 180,
        },
    )
