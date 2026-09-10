from datetime import UTC, datetime

import pytest

from api.core.errors import DataIntegrationError
from api.models.ai import AssistantRequest
from api.providers.fake import FakeAIProvider
from api.services.assistant_service import AssistantService
from api.services.context_service import AcademicContextService


class ContextStore:
    def __init__(self, rows=None) -> None:
        self.rows = rows or {}
        self.calls = []

    async def select(self, table, *, filters, **_kwargs):
        self.calls.append((table, filters))
        return self.rows.get(table, [])

    async def insert(self, *_args, **_kwargs):
        raise DataIntegrationError()


@pytest.mark.asyncio
async def test_context_filters_every_query_to_authenticated_student() -> None:
    store = ContextStore({"profiles": [{"id": "student-a", "timezone": "UTC"}]})
    await AcademicContextService(store).build("student-a", "planner")
    assert store.calls
    for table, filters in store.calls:
        ownership_field = "id" if table == "profiles" else "student_id"
        assert filters[ownership_field] == "eq.student-a"


@pytest.mark.asyncio
async def test_empty_context_does_not_call_ai_provider() -> None:
    provider = FakeAIProvider("This answer must not be used")
    response = await AssistantService(ContextStore(), provider).chat(
        "student-a", AssistantRequest(message="What should I do today?")
    )
    assert response.answer == "No academic data is available for this request."
    assert provider.calls == []
    assert "No academic data is available for this request." in response.warnings


@pytest.mark.asyncio
async def test_document_question_without_selected_evidence_is_refused() -> None:
    provider = FakeAIProvider("This answer must not be used")
    response = await AssistantService(ContextStore(), provider).chat(
        "student-a", AssistantRequest(message="Explain this using my uploaded notes")
    )
    assert response.answer == "I could not find enough verified information in the selected materials."
    assert provider.calls == []
    assert response.suggested_actions[0].route == "/study-copilot"


@pytest.mark.asyncio
async def test_assistant_uses_only_projected_context_fields() -> None:
    store = ContextStore({
        "assignments": [{
            "id": "a1", "title": "Verified task", "due_at": "2026-09-11T10:00:00Z",
            "student_private_note": "must not reach model", "updated_at": datetime.now(UTC).isoformat(),
        }]
    })
    provider = FakeAIProvider("Use the verified task.")
    await AssistantService(store, provider).chat(
        "student-a", AssistantRequest(message="Which assignment is urgent?")
    )
    assert "student_private_note" not in provider.calls[0]["verified_context"]


@pytest.mark.asyncio
async def test_context_excludes_distant_history() -> None:
    store = ContextStore({
        "assignments": [
            {"id": "old", "title": "Old", "due_at": "2025-01-01T10:00:00Z"},
            {"id": "current", "title": "Current", "due_at": "2026-09-11T10:00:00Z"},
        ]
    })
    context = await AcademicContextService(store).build(
        "student-a", "assignment",
        date_from=datetime(2026, 9, 10, tzinfo=UTC),
        date_to=datetime(2026, 9, 17, tzinfo=UTC),
    )
    assert [item["id"] for item in context.assignments] == ["current"]


class OfflineStore(ContextStore):
    async def select(self, *_args, **_kwargs):
        raise DataIntegrationError()


@pytest.mark.asyncio
async def test_complete_data_integration_failure_is_not_reported_as_empty_data() -> None:
    with pytest.raises(DataIntegrationError):
        await AcademicContextService(OfflineStore()).build("student-a", "today")
