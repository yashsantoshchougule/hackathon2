from __future__ import annotations

import re
from datetime import UTC, datetime
from pathlib import PurePath
from uuid import uuid4

from api.core.config import Settings
from api.core.errors import AppError
from api.core.supabase_client import SupabaseClient
from api.models.ai import DocumentUploadResponse
from api.services.document_service import DocumentService


class ResourceService:
    def __init__(self, client: SupabaseClient, settings: Settings) -> None:
        self.client = client
        self.settings = settings
        self.extractor = DocumentService(settings.max_upload_bytes)

    async def process(
        self,
        student_id: str,
        filename: str,
        content_type: str,
        content: bytes,
        subject_id: str | None,
    ) -> DocumentUploadResponse:
        document = self.extractor.extract(content, content_type, filename)
        duplicate = await self.client.select(
            "documents",
            filters={"student_id": f"eq.{student_id}", "file_hash": f"eq.{document.sha256}"},
            limit=1,
        )
        if duplicate:
            raise AppError(409, "DUPLICATE_DOCUMENT", "This document has already been processed.")
        document_id = uuid4()
        safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", PurePath(filename).name)[:120] or "resource"
        storage_path = f"{student_id}/{document.sha256}/{safe_name}"
        await self.client.upload(self.settings.resource_storage_bucket, storage_path, content, content_type)
        created = datetime.now(UTC).isoformat()
        await self.client.insert(
            "documents",
            {
                "id": str(document_id),
                "student_id": student_id,
                "subject_id": subject_id,
                "title": safe_name,
                "storage_bucket": self.settings.resource_storage_bucket,
                "storage_path": storage_path,
                "mime_type": content_type,
                "file_hash": document.sha256,
                "processing_status": "processed",
                "created_at": created,
                "updated_at": created,
            },
        )
        chunks: list[dict] = []
        for page_number, page in enumerate(document.pages, 1):
            for content_chunk in self._chunks(page):
                chunks.append(
                    {
                        "id": str(uuid4()),
                        "student_id": student_id,
                        "document_id": str(document_id),
                        "subject_id": subject_id,
                        "page_number": page_number,
                        "content": content_chunk,
                        "created_at": created,
                        "updated_at": created,
                    }
                )
        if chunks:
            await self.client.insert("document_chunks", chunks)
        return DocumentUploadResponse(
            document_id=document_id,
            title=safe_name,
            processing_status="processed",
            page_count=len(document.pages),
            chunk_count=len(chunks),
            resource_route=f"/resources/{document_id}",
        )

    @staticmethod
    def _chunks(text: str, size: int = 1000, overlap: int = 120) -> list[str]:
        normalized = re.sub(r"\n{3,}", "\n\n", text).strip()
        if not normalized:
            return []
        result: list[str] = []
        start = 0
        while start < len(normalized):
            proposed_end = min(len(normalized), start + size)
            end = proposed_end
            if proposed_end < len(normalized):
                split = max(normalized.rfind("\n", start, proposed_end), normalized.rfind(" ", start, proposed_end))
                if split > start + size // 2:
                    end = split
            result.append(normalized[start:end].strip())
            if end >= len(normalized):
                break
            start = max(start + 1, end - overlap)
        return result
