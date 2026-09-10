from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from api.core.errors import AppError, DataIntegrationError
from api.core.supabase_client import SupabaseClient
from api.models.ai import (
    AcademicContext,
    AssistantRequest,
    AssistantResponse,
    Citation,
    CopilotRequest,
    PageContext,
    PlanGenerateRequest,
    SuggestedAction,
)
from api.providers.base import AIProvider
from api.services.ai_service import AIService
from api.services.context_service import AcademicContextService
from api.services.planner_service import PlannerService
from api.services.priority_service import PriorityService
from api.services.rag_service import RAGService


class AssistantService:
    def __init__(self, client: SupabaseClient, provider: AIProvider) -> None:
        self.client = client
        self.contexts = AcademicContextService(client)
        self.ai = AIService(provider)
        self.planner = PlannerService(client)
        self.rag = RAGService(client, provider)
        self.priorities = PriorityService()

    async def chat(self, student_id: str, request: AssistantRequest) -> AssistantResponse:
        intent = self._intent(request.message, request.page_context)
        conversation_id = request.conversation_id or uuid4()
        warnings: list[str] = []
        provider_name: str | None = None
        model_name: str | None = None
        await self._prepare_conversation(student_id, conversation_id, request.conversation_id is None, warnings)

        if intent == "document":
            if request.page_context and request.page_context.selected_document_ids:
                result = await self.rag.query(
                    student_id,
                    CopilotRequest(
                        question=request.message,
                        subject_id=request.page_context.selected_subject_id,
                        document_ids=request.page_context.selected_document_ids,
                    ),
                )
                answer = result.answer
                citations = result.citations
                warnings.extend(result.warnings)
                actions = [
                    SuggestedAction(type="resource", title=item.title, route=item.route, source_id=item.source_id)
                    for item in citations[:3]
                ]
                used = ["documents"]
            else:
                answer = "I could not find enough verified information in the selected materials."
                citations = []
                warnings.append("No verified source was found.")
                actions = [SuggestedAction(type="general", title="Select study materials", route="/study-copilot")]
                used = []
        else:
            context = await self.contexts.build(student_id, intent)
            warnings.extend(context.missing_data_warnings)
            if intent == "planner":
                plan = await self.planner.generate(student_id, context, PlanGenerateRequest())
                answer = plan.explanation
                warnings.extend(plan.warnings)
                citations = []
                actions = [SuggestedAction(type="planner", title="Review study plan", route="/planner", requires_confirmation=True)]
                used = self._used(context)
            elif intent == "attendance":
                answer, actions = self._attendance_answer(context)
                citations = self._citations(context, "attendance")
                used = ["attendance"] if context.attendance else []
            elif not self._has_relevant_data(context):
                answer = "No academic data is available for this request."
                citations = []
                actions = []
                used = []
            else:
                generated = await self.ai.answer(context, request.message)
                answer = generated.text
                provider_name = generated.provider
                model_name = generated.model
                citations = self._citations(context, intent)
                priority_items = self.priorities.calculate(context)[:3]
                actions = [
                    SuggestedAction(
                        type=(
                            "attendance" if item.route == "/attendance"
                            else "assignment" if item.route.startswith("/assignments/")
                            else "general"
                        ),
                        title=item.recommended_action,
                        route=item.route,
                        source_id=item.task_id,
                    )
                    for item in priority_items
                ]
                used = self._used(context)

        response = AssistantResponse(
            conversation_id=conversation_id,
            message_id=uuid4(),
            answer=answer,
            citations=citations,
            suggested_actions=actions,
            warnings=list(dict.fromkeys(warnings)),
            used_data_types=used,
            generated_at=datetime.now(UTC),
        )
        saved = await self._save_messages(
            student_id, request.message, response, provider_name=provider_name, model_name=model_name
        )
        if not saved and "Conversation history could not be stored." not in response.warnings:
            response.warnings.append("Conversation history could not be stored.")
        return response

    async def _prepare_conversation(
        self, student_id: str, conversation_id: UUID, is_new: bool, warnings: list[str]
    ) -> None:
        try:
            if is_new:
                await self.client.insert(
                    "chat_sessions",
                    {"id": str(conversation_id), "student_id": student_id, "created_at": datetime.now(UTC).isoformat()},
                )
                return
            existing = await self.client.select(
                "chat_sessions",
                filters={"id": f"eq.{conversation_id}", "student_id": f"eq.{student_id}"},
                limit=1,
            )
            if not existing:
                raise AppError(404, "CONVERSATION_NOT_FOUND", "The conversation was not found.")
        except DataIntegrationError:
            warnings.append("Conversation history could not be stored.")

    async def _save_messages(
        self,
        student_id: str,
        student_message: str,
        response: AssistantResponse,
        *,
        provider_name: str | None,
        model_name: str | None,
    ) -> bool:
        try:
            timestamp = response.generated_at.isoformat()
            await self.client.insert(
                "chat_messages",
                [
                    {
                        "id": str(uuid4()), "conversation_id": str(response.conversation_id), "student_id": student_id,
                        "role": "user", "content": student_message, "created_at": timestamp,
                    },
                    {
                        "id": str(response.message_id), "conversation_id": str(response.conversation_id), "student_id": student_id,
                        "role": "assistant", "content": response.answer,
                        "citations": [item.model_dump(mode="json") for item in response.citations],
                        "provider": provider_name, "model": model_name,
                        "source_ids": [item.source_id for item in response.citations], "created_at": timestamp,
                    },
                ],
            )
            return True
        except DataIntegrationError:
            return False

    @staticmethod
    def _intent(message: str, page_context: PageContext | None) -> str:
        normalized = message.lower()
        if page_context and page_context.selected_document_ids:
            return "document"
        if any(word in normalized for word in ("my notes", "document", "study material", "uploaded notes")):
            return "document"
        if any(word in normalized for word in ("study plan", "plan my", "reschedule", "recovery")):
            return "planner"
        if any(word in normalized for word in ("attendance", "miss class", "miss lecture", "75%")):
            return "attendance"
        if any(word in normalized for word in ("notice", "circular", "documents required")):
            return "notice"
        if any(word in normalized for word in ("exam", "examination", "test")):
            return "examination"
        if any(word in normalized for word in ("timetable", "lecture", "class tomorrow")):
            return "timetable"
        if any(word in normalized for word in ("assignment", "deadline", "submit")):
            return "assignment"
        if "today" in normalized:
            return "today"
        if "week" in normalized:
            return "week"
        return "general"

    @staticmethod
    def _has_relevant_data(context: AcademicContext) -> bool:
        return any(
            (
                context.profile, context.subjects, context.assignments, context.examinations,
                context.timetable, context.attendance, context.notices, context.documents,
            )
        )

    @staticmethod
    def _used(context: AcademicContext) -> list[str]:
        values = {
            "assignments": context.assignments,
            "examinations": context.examinations,
            "timetable": context.timetable,
            "attendance": context.attendance,
            "notices": context.notices,
            "documents": context.documents,
            "study_plan": context.plan_items,
        }
        return [key for key, value in values.items() if value]

    @staticmethod
    def _attendance_answer(context: AcademicContext) -> tuple[str, list[SuggestedAction]]:
        if not context.attendance:
            return "Attendance information has not been added.", [
                SuggestedAction(type="attendance", title="Open attendance", route="/attendance")
            ]
        lines = []
        for item in context.attendance[:5]:
            percentage = item.get("percentage")
            minimum = item.get("minimum_percentage")
            required = item.get("classes_required")
            text = f"Verified attendance: {percentage}%"
            if minimum is not None:
                text += f" (minimum {minimum}%)"
            if required is not None:
                text += f". Classes required to reach the minimum: {required}."
            lines.append(text)
        return "\n".join(lines), [SuggestedAction(type="attendance", title="Review attendance", route="/attendance")]

    @staticmethod
    def _citations(context: AcademicContext, intent: str) -> list[Citation]:
        mapping = {
            "assignment": (context.assignments, "assignment", "/assignments/{}"),
            "examination": (context.examinations, "examination", "/examinations"),
            "notice": (context.notices, "notice", "/notices/{}"),
            "attendance": (context.attendance, "attendance", "/attendance"),
            "timetable": (context.timetable, "timetable", "/timetable"),
        }
        groups = [mapping[intent]] if intent in mapping else list(mapping.values())
        result: list[Citation] = []
        for rows, source_type, route_template in groups:
            for row in rows[:3]:
                source_id = str(row.get("id") or row.get("subject_id") or "")
                if not source_id:
                    continue
                route = route_template.format(source_id) if "{}" in route_template else route_template
                result.append(
                    Citation(
                        source_type=source_type,
                        source_id=source_id,
                        title=str(row.get("title") or source_type.replace("_", " ").title()),
                        route=route,
                        updated_at=row.get("updated_at"),
                    )
                )
        return result[:8]
