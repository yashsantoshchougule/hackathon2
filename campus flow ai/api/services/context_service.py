from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from api.core.errors import DataIntegrationError
from api.core.supabase_client import SupabaseClient
from api.models.ai import AcademicContext


ALLOWED_FIELDS: dict[str, set[str]] = {
    "profiles": {"id", "course", "semester", "timezone", "updated_at"},
    "student_subjects": {"id", "subject_id", "difficulty", "is_weak", "subjects", "updated_at"},
    "assignments": {
        "id", "subject_id", "title", "description", "due_at", "deadline", "status",
        "completed", "estimated_minutes", "updated_at",
    },
    "examinations": {"id", "subject_id", "title", "starts_at", "exam_date", "ends_at", "location", "updated_at"},
    "timetable_entries": {"id", "subject_id", "title", "starts_at", "ends_at", "day_of_week", "updated_at"},
    "attendance_summaries": {
        "id", "subject_id", "attended_classes", "total_classes", "percentage",
        "minimum_percentage", "classes_required", "updated_at",
    },
    "notices": {"id", "title", "summary", "publication_date", "deadline", "status", "updated_at"},
    "study_preferences": {
        "id", "timezone", "preferred_study_start", "preferred_study_end", "average_session_minutes",
        "break_minutes", "daily_available_minutes", "updated_at",
    },
    "study_plan_items": {
        "id", "plan_id", "title", "starts_at", "ends_at", "completed", "source_type",
        "source_id", "subject", "priority", "reason", "updated_at",
    },
    "reminders": {"id", "title", "remind_at", "source_entity_id", "status", "updated_at"},
    "documents": {"id", "title", "subject_id", "processing_status", "updated_at"},
}


INTENT_TABLES = {
    "today": {"profiles", "assignments", "examinations", "timetable_entries", "attendance_summaries", "reminders"},
    "week": set(ALLOWED_FIELDS),
    "assignment": {"profiles", "assignments", "study_preferences"},
    "examination": {"profiles", "examinations", "assignments", "study_preferences"},
    "timetable": {"profiles", "timetable_entries", "examinations"},
    "attendance": {"profiles", "attendance_summaries", "timetable_entries"},
    "notice": {"profiles", "notices"},
    "planner": {
        "profiles", "student_subjects", "assignments", "examinations", "timetable_entries",
        "attendance_summaries", "study_preferences", "study_plan_items", "reminders",
    },
    "document": {"profiles", "documents"},
    "general": set(ALLOWED_FIELDS),
}


class AcademicContextService:
    def __init__(self, client: SupabaseClient) -> None:
        self.client = client

    @staticmethod
    def _student_filter(table: str, student_id: str) -> dict[str, str]:
        if table == "profiles":
            return {"id": f"eq.{student_id}"}
        return {"student_id": f"eq.{student_id}"}

    @staticmethod
    def _project(table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        allowed = ALLOWED_FIELDS[table]
        return [{key: value for key, value in row.items() if key in allowed} for row in rows]

    async def _safe_select(self, table: str, student_id: str) -> tuple[str, list[dict[str, Any]], str | None]:
        try:
            rows = await self.client.select(
                table,
                filters=self._student_filter(table, student_id),
                order="updated_at.desc",
                limit=200,
            )
            return table, self._project(table, rows), None
        except DataIntegrationError:
            label = table.replace("_", " ")
            return table, [], f"{label.capitalize()} integration is not available."

    async def build(
        self,
        student_id: str,
        intent: str,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> AcademicContext:
        start = (date_from or datetime.now(UTC)).astimezone(UTC)
        default_days = 1 if intent == "today" else 7
        end = (date_to or (start + timedelta(days=default_days))).astimezone(UTC)
        tables = INTENT_TABLES.get(intent, INTENT_TABLES["general"])
        results = await asyncio.gather(*(self._safe_select(table, student_id) for table in sorted(tables)))
        integration_failures = sum(1 for _, _, warning in results if warning)
        if results and integration_failures == len(results):
            raise DataIntegrationError()
        data = {
            table: self._filter_date_range(table, rows, start, end)
            for table, rows, _ in results
        }
        warnings = [warning for _, _, warning in results if warning]

        profile_rows = data.get("profiles", [])
        preference_rows = data.get("study_preferences", [])
        timezone = "UTC"
        if profile_rows:
            timezone = str(profile_rows[0].get("timezone") or timezone)
        if preference_rows:
            timezone = str(preference_rows[0].get("timezone") or timezone)

        source_ids: list[str] = []
        last_updated: dict[str, datetime | None] = {}
        for table, rows in data.items():
            source_ids.extend(str(row["id"]) for row in rows if row.get("id") is not None)
            stamps = [self._parse_datetime(row.get("updated_at")) for row in rows]
            stamps = [stamp for stamp in stamps if stamp]
            last_updated[table] = max(stamps) if stamps else None

        if not any(data.values()):
            warnings.insert(0, "No academic data is available for this request.")
        if "attendance_summaries" in tables and not data.get("attendance_summaries"):
            warnings.append("Attendance information has not been added.")

        return AcademicContext(
            student_id=student_id,
            timezone=timezone,
            date_from=start,
            date_to=end,
            profile=profile_rows[0] if profile_rows else None,
            subjects=data.get("student_subjects", []),
            assignments=data.get("assignments", []),
            examinations=data.get("examinations", []),
            timetable=data.get("timetable_entries", []),
            attendance=data.get("attendance_summaries", []),
            notices=data.get("notices", []),
            study_preferences=preference_rows[0] if preference_rows else None,
            plan_items=data.get("study_plan_items", []),
            reminders=data.get("reminders", []),
            documents=data.get("documents", []),
            source_ids=source_ids,
            last_updated=last_updated,
            missing_data_warnings=list(dict.fromkeys(warnings)),
        )

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value.astimezone(UTC)
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
            except ValueError:
                return None
        return None

    @classmethod
    def _filter_date_range(
        cls, table: str, rows: list[dict[str, Any]], start: datetime, end: datetime
    ) -> list[dict[str, Any]]:
        date_fields = {
            "assignments": ("due_at", "deadline"),
            "examinations": ("starts_at", "exam_date"),
            "timetable_entries": ("starts_at",),
            "notices": ("deadline", "publication_date"),
            "study_plan_items": ("starts_at",),
            "reminders": ("remind_at",),
        }
        fields = date_fields.get(table)
        if fields is None:
            return rows
        lower_bound = start - timedelta(days=30 if table in {"assignments", "notices"} else 1)
        filtered: list[dict[str, Any]] = []
        for row in rows:
            value = next((row.get(field) for field in fields if row.get(field)), None)
            parsed = cls._parse_datetime(value)
            if parsed is None or lower_bound <= parsed <= end:
                filtered.append(row)
        return filtered
