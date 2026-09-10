from datetime import UTC, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from api.core.config import Settings, get_settings
from api.core.security import AuthenticatedUser, require_student
from api.core.supabase_client import SupabaseClient
from api.models.ai import PlanGenerateRequest, StudyPlan
from api.services.context_service import AcademicContextService
from api.services.planner_service import PlannerService


router = APIRouter(prefix="/api/planner", tags=["planner"])


def service(user: AuthenticatedUser, settings: Settings) -> tuple[AcademicContextService, PlannerService]:
    client = SupabaseClient(settings, user.access_token)
    return AcademicContextService(client), PlannerService(client)


@router.post("/generate", response_model=StudyPlan, status_code=status.HTTP_201_CREATED)
async def generate_plan(
    payload: PlanGenerateRequest,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> StudyPlan:
    contexts, planner = service(user, settings)
    context = await contexts.build(
        user.id,
        "planner",
        date_from=datetime.combine(payload.date_from, time.min, tzinfo=UTC) if payload.date_from else None,
        date_to=datetime.combine(payload.date_to, time.max, tzinfo=UTC) if payload.date_to else None,
    )
    return await planner.generate(user.id, context, payload)


@router.get("/current", response_model=StudyPlan | None)
async def current_plan(
    response: Response,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> StudyPlan | None:
    _, planner = service(user, settings)
    plan = await planner.current(user.id)
    if plan is None:
        response.status_code = status.HTTP_204_NO_CONTENT
    return plan


@router.post("/{plan_id}/confirm", response_model=StudyPlan)
async def confirm_plan(
    plan_id: UUID,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> StudyPlan:
    _, planner = service(user, settings)
    return await planner.set_status(user.id, plan_id, "confirmed")


@router.post("/{plan_id}/reject", response_model=StudyPlan)
async def reject_plan(
    plan_id: UUID,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> StudyPlan:
    _, planner = service(user, settings)
    return await planner.set_status(user.id, plan_id, "rejected")
