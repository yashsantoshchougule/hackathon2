from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PriorityLevel(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class Citation(StrictModel):
    source_type: str
    source_id: str
    title: str
    route: str
    page_number: int | None = None
    section_id: str | None = None
    excerpt: str | None = Field(default=None, max_length=320)
    updated_at: datetime | None = None


class SuggestedAction(StrictModel):
    type: Literal["assignment", "attendance", "planner", "notice", "resource", "general"]
    title: str
    route: str
    source_id: str | None = None
    requires_confirmation: bool = False

    @field_validator("route")
    @classmethod
    def route_must_be_internal(cls, value: str) -> str:
        if not value.startswith("/") or value.startswith("//"):
            raise ValueError("route must be an internal application route")
        return value


class PageContext(StrictModel):
    current_route: str | None = None
    selected_subject_id: str | None = None
    selected_document_ids: list[str] = Field(default_factory=list, max_length=20)


class AssistantRequest(StrictModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: UUID | None = None
    page_context: PageContext | None = None


class AssistantResponse(StrictModel):
    conversation_id: UUID
    message_id: UUID
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    suggested_actions: list[SuggestedAction] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    used_data_types: list[str] = Field(default_factory=list)
    generated_at: datetime


class AcademicContext(StrictModel):
    student_id: str
    timezone: str = "UTC"
    date_from: datetime
    date_to: datetime
    profile: dict[str, Any] | None = None
    subjects: list[dict[str, Any]] = Field(default_factory=list)
    assignments: list[dict[str, Any]] = Field(default_factory=list)
    examinations: list[dict[str, Any]] = Field(default_factory=list)
    timetable: list[dict[str, Any]] = Field(default_factory=list)
    attendance: list[dict[str, Any]] = Field(default_factory=list)
    notices: list[dict[str, Any]] = Field(default_factory=list)
    study_preferences: dict[str, Any] | None = None
    plan_items: list[dict[str, Any]] = Field(default_factory=list)
    reminders: list[dict[str, Any]] = Field(default_factory=list)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    last_updated: dict[str, datetime | None] = Field(default_factory=dict)
    missing_data_warnings: list[str] = Field(default_factory=list)


class PriorityResult(StrictModel):
    task_id: str
    title: str
    recommended_action: str
    priority: PriorityLevel
    score: int = Field(ge=0, le=100)
    reason: str
    source_data_considered: list[str]
    deadline: datetime | None = None
    estimated_minutes: int | None = Field(default=None, ge=0)
    consequence_of_delay: str
    missing_data_warning: str | None = None
    route: str


class PlanGenerateRequest(StrictModel):
    date_from: date | None = None
    date_to: date | None = None
    recovery_mode: bool = False


class PlanItem(StrictModel):
    id: UUID
    source_type: Literal["assignment", "examination", "recovery", "general"]
    source_id: str | None = None
    title: str
    subject: str | None = None
    starts_at: datetime
    ends_at: datetime
    priority: PriorityLevel
    reason: str
    completed: bool = False

    @field_validator("ends_at")
    @classmethod
    def valid_end(cls, value: datetime, info):
        start = info.data.get("starts_at")
        if start and value <= start:
            raise ValueError("ends_at must be after starts_at")
        return value


class StudyPlan(StrictModel):
    id: UUID
    status: Literal["pending_confirmation", "confirmed", "rejected"]
    date_from: date
    date_to: date
    items: list[PlanItem]
    warnings: list[str] = Field(default_factory=list)
    explanation: str
    recovery_mode: bool = False
    created_at: datetime


class ExtractedField(StrictModel):
    value: str | list[str] | None = None
    confidence: float = Field(ge=0, le=1)
    source_page: int | None = Field(default=None, ge=1)
    source_location: str | None = None
    requires_confirmation: bool = True


class NoticeExtractionData(StrictModel):
    title: ExtractedField
    issuing_department: ExtractedField
    publication_date: ExtractedField
    deadline: ExtractedField
    applicable_courses: ExtractedField
    applicable_semesters: ExtractedField
    instructions: ExtractedField
    required_documents: ExtractedField
    fees: ExtractedField
    relevant_subjects: ExtractedField
    location: ExtractedField
    contact_information: ExtractedField
    required_student_actions: ExtractedField


class NoticeExtraction(StrictModel):
    id: UUID
    notice_id: str
    document_id: str
    document_title: str
    status: Literal["review_required", "confirmed", "rejected"]
    fields: NoticeExtractionData
    warnings: list[str] = Field(default_factory=list)
    original_document_route: str
    created_at: datetime


class NoticeReviewRequest(StrictModel):
    fields: NoticeExtractionData | None = None


class CopilotMode(str, Enum):
    answer = "answer"
    simpler = "simpler"
    practice = "practice"
    revision = "revision"


class CopilotRequest(StrictModel):
    question: str = Field(min_length=1, max_length=2000)
    subject_id: str | None = None
    document_ids: list[str] = Field(min_length=1, max_length=20)
    mode: CopilotMode = CopilotMode.answer


class CopilotResponse(StrictModel):
    answer: str
    citations: list[Citation]
    sufficient_evidence: bool
    warnings: list[str] = Field(default_factory=list)
    generated_at: datetime


class GroundedAnswer(StrictModel):
    answer: str = Field(min_length=1)
    citation_ids: list[str] = Field(min_length=1, max_length=6)


class DocumentUploadResponse(StrictModel):
    document_id: UUID
    title: str
    processing_status: Literal["processed"]
    page_count: int
    chunk_count: int
    resource_route: str


class DocumentSummary(StrictModel):
    id: UUID
    title: str
    subject_id: str | None = None
    processing_status: str
    updated_at: datetime | None = None


class DashboardNextAction(StrictModel):
    title: str
    reason: str
    priority: PriorityLevel
    estimated_minutes: int | None = None
    source_ids: list[str]
    route: str


class Notification(StrictModel):
    notification_type: Literal["academic_risk", "deadline", "attendance", "study_plan"]
    source_entity_id: str
    message: str
    severity: PriorityLevel
    destination_route: str


class DashboardSummary(StrictModel):
    next_action: DashboardNextAction | None = None
    risks: list[PriorityResult] = Field(default_factory=list)
    plan_progress: dict[str, int]
    notifications: list[Notification] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
