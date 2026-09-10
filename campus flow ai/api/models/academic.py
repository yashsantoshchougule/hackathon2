"""Pydantic contracts to be mounted with the existing FastAPI auth dependency."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

SourceType = Literal["faculty", "student", "notice_extraction", "system_import"]
VerificationStatus = Literal["verified", "student_confirmed", "pending_confirmation", "unverified", "rejected"]


class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    subject_id: UUID
    description: str | None = Field(default=None, max_length=5000)
    due_at: datetime | None = None
    estimated_minutes: int | None = Field(default=None, ge=0, le=100_000)
    priority: Literal["low", "medium", "high", "urgent"] = "medium"

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title is required")
        return value.strip()


class AttendanceWhatIf(BaseModel):
    subject_id: UUID
    future_classes: int = Field(ge=1, le=500)
    action: Literal["attend", "miss"]


class TimetableWrite(BaseModel):
    subject_id: UUID | None = None
    entry_type: Literal["lecture", "practical", "tutorial", "exam", "event", "personal"]
    starts_at: datetime
    ends_at: datetime
    timezone: str = Field(min_length=1, max_length=80)
    location: str | None = Field(default=None, max_length=300)
    recurrence: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def end_must_follow_start(self) -> "TimetableWrite":
        if self.ends_at <= self.starts_at:
            raise ValueError("end time must be after start time")
        return self


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    scheduled_at: datetime
    timezone: str = Field(min_length=1, max_length=80)
    source_entity_type: Literal["assignment", "examination", "timetable", "attendance", "notice", "study_plan", "atkt_application", "personal"] = "personal"
    source_entity_id: UUID | None = None


class AcademicRecordMeta(BaseModel):
    id: UUID
    source_type: SourceType
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime
