from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from api.core.config import Settings, get_settings
from api.core.security import AuthenticatedUser, require_student
from api.core.supabase_client import SupabaseClient
from api.models.ai import DocumentSummary, DocumentUploadResponse
from api.services.resource_service import ResourceService


router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentSummary])
async def list_documents(
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> list[DocumentSummary]:
    client = SupabaseClient(settings, user.access_token)
    rows = await client.select(
        "documents",
        filters={"student_id": f"eq.{user.id}", "processing_status": "eq.processed"},
        order="updated_at.desc",
        limit=100,
    )
    return [
        DocumentSummary(
            id=row["id"],
            title=str(row.get("title") or "Study resource"),
            subject_id=str(row["subject_id"]) if row.get("subject_id") else None,
            processing_status=str(row.get("processing_status") or "unknown"),
            updated_at=row.get("updated_at"),
        )
        for row in rows
    ]


@router.post("/process", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def process_document(
    file: UploadFile = File(...),
    subject_id: str | None = Form(default=None),
    user: AuthenticatedUser = Depends(require_student),
    settings: Settings = Depends(get_settings),
) -> DocumentUploadResponse:
    content = await file.read(settings.max_upload_bytes + 1)
    client = SupabaseClient(settings, user.access_token)
    return await ResourceService(client, settings).process(
        user.id,
        file.filename or "resource",
        file.content_type or "application/octet-stream",
        content,
        subject_id,
    )
