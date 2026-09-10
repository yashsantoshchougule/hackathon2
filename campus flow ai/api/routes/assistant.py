from fastapi import APIRouter, Depends

from api.core.config import Settings, get_settings
from api.core.security import AuthenticatedUser, require_student
from api.core.supabase_client import SupabaseClient
from api.models.ai import AssistantRequest, AssistantResponse
from api.providers.base import AIProvider
from api.providers.factory import get_ai_provider
from api.services.assistant_service import AssistantService


router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post("/chat", response_model=AssistantResponse)
async def chat(
    payload: AssistantRequest,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_ai_provider),
) -> AssistantResponse:
    client = SupabaseClient(settings, user.access_token)
    return await AssistantService(client, provider).chat(user.id, payload)
