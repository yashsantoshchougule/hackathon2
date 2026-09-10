import pytest

from api.core.config import Settings
from api.core.errors import AppError
from api.providers.fake import FakeAIProvider
from api.models.ai import ExtractedField, NoticeExtractionData, NoticeReviewRequest
from api.services.document_service import DocumentService
from api.services.notice_service import NoticeService
from api.services.resource_service import ResourceService


def test_unsupported_upload_is_rejected() -> None:
    with pytest.raises(AppError) as exc:
        DocumentService(1000).extract(b"payload", "application/zip", "bad.zip")
    assert exc.value.code == "UNSUPPORTED_FILE_TYPE"


def test_empty_document_is_rejected() -> None:
    with pytest.raises(AppError) as exc:
        DocumentService(1000).extract(b"   ", "text/plain", "empty.txt")
    assert exc.value.code == "EMPTY_DOCUMENT"


class DuplicateStore:
    async def select(self, *_args, **_kwargs):
        return [{"id": "already-there"}]


@pytest.mark.asyncio
async def test_duplicate_resource_is_rejected() -> None:
    service = ResourceService(DuplicateStore(), Settings(max_upload_bytes=1024))
    with pytest.raises(AppError) as exc:
        await service.process("student-a", "note.txt", "text/plain", b"Useful notes", None)
    assert exc.value.code == "DUPLICATE_DOCUMENT"


@pytest.mark.asyncio
async def test_duplicate_notice_is_rejected_before_provider_call() -> None:
    provider = FakeAIProvider()
    service = NoticeService(DuplicateStore(), provider, Settings(max_upload_bytes=1024))
    with pytest.raises(AppError) as exc:
        await service.extract("student-a", "notice.txt", "text/plain", b"A unique notice body")
    assert exc.value.code == "DUPLICATE_DOCUMENT"
    assert provider.calls == []


@pytest.mark.asyncio
async def test_invalid_notice_output_is_retried_once() -> None:
    provider = FakeAIProvider("not valid json")
    service = NoticeService(DuplicateStore(), provider, Settings())
    with pytest.raises(AppError) as exc:
        await service._structured_extract("Notice evidence")
    assert exc.value.code == "AI_OUTPUT_INVALID"
    assert len(provider.calls) == 2


def notice_fields() -> NoticeExtractionData:
    empty = lambda value=None: ExtractedField(value=value, confidence=0.8, requires_confirmation=True)
    return NoticeExtractionData(
        title=empty("Exam form"), issuing_department=empty("Registrar"), publication_date=empty(),
        deadline=empty("2026-09-20T10:00:00Z"), applicable_courses=empty([]), applicable_semesters=empty([]),
        instructions=empty("Submit the form"), required_documents=empty(["ID"]), fees=empty(),
        relevant_subjects=empty([]), location=empty(), contact_information=empty(),
        required_student_actions=empty(["Submit form"]),
    )


class NoticeStore:
    def __init__(self) -> None:
        self.inserted = []

    async def select(self, table, *, filters, **_kwargs):
        if table == "notice_extractions":
            return [{
                "id": "d28bea31-b84e-4ca6-85a8-d73c35d56c31", "student_id": "student-a",
                "notice_id": "notice-1", "document_id": "document-1", "document_title": "notice.pdf",
                "status": "review_required", "extracted_data": notice_fields().model_dump(mode="json"),
                "created_at": "2026-09-10T10:00:00Z",
            }]
        if table == "reminders":
            return []
        return []

    async def update(self, table, values, *, filters):
        if table == "notice_extractions":
            return [{
                "id": "d28bea31-b84e-4ca6-85a8-d73c35d56c31", "notice_id": "notice-1",
                "document_id": "document-1", "document_title": "notice.pdf", "status": values["status"],
                "extracted_data": values["extracted_data"], "created_at": "2026-09-10T10:00:00Z",
            }]
        return []

    async def insert(self, table, values):
        self.inserted.append((table, values))
        return [values]


@pytest.mark.asyncio
async def test_notice_confirmation_creates_reminder_only_after_review() -> None:
    store = NoticeStore()
    service = NoticeService(store, FakeAIProvider(), Settings())
    result = await service.review(
        "student-a", "notice-1", "confirmed", NoticeReviewRequest(fields=notice_fields())
    )
    assert result.status == "confirmed"
    assert any(table == "reminders" for table, _ in store.inserted)


def test_notice_dates_must_be_iso_formatted() -> None:
    fields = notice_fields()
    fields.deadline.value = "sometime next week"
    with pytest.raises(ValueError):
        NoticeService._validate_fields(fields)
