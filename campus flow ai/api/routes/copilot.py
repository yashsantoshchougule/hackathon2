from fastapi import APIRouter, Depends

from api.core.config import Settings, get_settings
from api.core.security import AuthenticatedUser, require_student
from api.core.supabase_client import SupabaseClient
from api.models.ai import CopilotRequest, CopilotResponse
from api.providers.base import AIProvider
from api.providers.factory import get_ai_provider
from api.services.rag_service import RAGService


router = APIRouter(prefix="/api/copilot", tags=["copilot"])


@router.post("/query", response_model=CopilotResponse)
async def query(
    payload: CopilotRequest,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_ai_provider),
) -> CopilotResponse:
    client = SupabaseClient(settings, user.access_token)
    return await RAGService(client, provider).query(user.id, payload)
