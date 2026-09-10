from fastapi import APIRouter, Depends

from api.core.config import Settings, get_settings
from api.core.security import AuthenticatedUser, require_student
from api.core.supabase_client import SupabaseClient
from api.models.ai import DashboardNextAction, DashboardSummary
from api.services.context_service import AcademicContextService
from api.services.priority_service import PriorityService


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/ai-summary", response_model=DashboardSummary)
async def ai_summary(
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> DashboardSummary:
    client = SupabaseClient(settings, user.access_token)
    context = await AcademicContextService(client).build(user.id, "week")
    priorities = PriorityService().calculate(context)
    next_action = None
    if priorities:
        item = priorities[0]
        next_action = DashboardNextAction(
            title=item.recommended_action,
            reason=item.reason,
            priority=item.priority,
            estimated_minutes=item.estimated_minutes,
            source_ids=[item.task_id.removeprefix("exam:").removeprefix("attendance:")],
            route=item.route,
        )
    completed = sum(1 for item in context.plan_items if item.get("completed") is True)
    return DashboardSummary(
        next_action=next_action,
        risks=[item for item in priorities if item.priority.value in {"critical", "high"}][:5],
        plan_progress={"completed_items": completed, "total_items": len(context.plan_items)},
        notifications=PriorityService.notifications(priorities)[:5],
        warnings=context.missing_data_warnings,
    )
