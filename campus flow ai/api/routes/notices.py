from fastapi import APIRouter, Depends, File, UploadFile, status

from api.core.config import Settings, get_settings
from api.core.security import AuthenticatedUser, require_student
from api.core.supabase_client import SupabaseClient
from api.models.ai import NoticeExtraction, NoticeReviewRequest
from api.providers.base import AIProvider
from api.providers.factory import get_ai_provider
from api.services.notice_service import NoticeService


router = APIRouter(prefix="/api/notices", tags=["notices"])


def service(user: AuthenticatedUser, settings: Settings, provider: AIProvider) -> NoticeService:
    return NoticeService(SupabaseClient(settings, user.access_token), provider, settings)


@router.post("/extract", response_model=NoticeExtraction, status_code=status.HTTP_201_CREATED)
async def extract_notice(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_ai_provider),
) -> NoticeExtraction:
    content = await file.read(settings.max_upload_bytes + 1)
    return await service(user, settings, provider).extract(
        user.id, file.filename or "notice", file.content_type or "application/octet-stream", content
    )


@router.get("/{notice_id}", response_model=NoticeExtraction)
async def get_notice(
    notice_id: str,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_ai_provider),
) -> NoticeExtraction:
    return await service(user, settings, provider).get(user.id, notice_id)


@router.post("/{notice_id}/confirm", response_model=NoticeExtraction)
async def confirm_notice(
    notice_id: str,
    payload: NoticeReviewRequest,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_ai_provider),
) -> NoticeExtraction:
    return await service(user, settings, provider).review(user.id, notice_id, "confirmed", payload)


@router.post("/{notice_id}/reject", response_model=NoticeExtraction)
async def reject_notice(
    notice_id: str,
    payload: NoticeReviewRequest,
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_ai_provider),
) -> NoticeExtraction:
    return await service(user, settings, provider).review(user.id, notice_id, "rejected", payload)
