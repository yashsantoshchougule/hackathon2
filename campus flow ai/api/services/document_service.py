from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass

from pypdf import PdfReader
from pypdf.errors import FileNotDecryptedError, PdfReadError

from api.core.errors import AppError


SUPPORTED_TYPES = {"application/pdf", "text/plain"}


@dataclass(frozen=True)
class ExtractedDocument:
    sha256: str
    pages: list[str]

    @property
    def text(self) -> str:
        return "\n\n".join(f"[Page {index}]\n{page}" for index, page in enumerate(self.pages, 1))


class DocumentService:
    def __init__(self, max_bytes: int) -> None:
        self.max_bytes = max_bytes

    def extract(self, content: bytes, content_type: str, filename: str) -> ExtractedDocument:
        if content_type not in SUPPORTED_TYPES:
            raise AppError(422, "UNSUPPORTED_FILE_TYPE", "Upload a PDF or plain-text document.")
        if not content or len(content) > self.max_bytes:
            raise AppError(422, "INVALID_FILE_SIZE", f"The document must be between 1 byte and {self.max_bytes} bytes.")
        digest = hashlib.sha256(content).hexdigest()
        if content_type == "text/plain":
            try:
                pages = [content.decode("utf-8")]
            except UnicodeDecodeError as exc:
                raise AppError(422, "DOCUMENT_ENCODING_ERROR", "The text document must use UTF-8 encoding.") from exc
        else:
            try:
                reader = PdfReader(io.BytesIO(content))
                if reader.is_encrypted:
                    raise AppError(422, "PASSWORD_PROTECTED_PDF", "Password-protected PDFs are not supported.")
                pages = [page.extract_text() or "" for page in reader.pages]
            except AppError:
                raise
            except (PdfReadError, FileNotDecryptedError, ValueError) as exc:
                raise AppError(422, "PDF_EXTRACTION_FAILED", "The PDF could not be read safely.") from exc
        pages = self._remove_repeated_lines([self._clean(page) for page in pages])
        if not any(page.strip() for page in pages):
            raise AppError(422, "EMPTY_DOCUMENT", "No readable text was found in this document.")
        return ExtractedDocument(sha256=digest, pages=pages)

    @staticmethod
    def _clean(text: str) -> str:
        text = text.replace("\x00", "")
        return re.sub(r"[ \t]+", " ", text).strip()

    @staticmethod
    def _remove_repeated_lines(pages: list[str]) -> list[str]:
        if len(pages) < 3:
            return pages
        counts: dict[str, int] = {}
        for page in pages:
            for line in set(line.strip() for line in page.splitlines() if line.strip()):
                counts[line] = counts.get(line, 0) + 1
        repeated = {line for line, count in counts.items() if count >= max(3, len(pages) // 2) and len(line) < 160}
        return ["\n".join(line for line in page.splitlines() if line.strip() not in repeated) for page in pages]
