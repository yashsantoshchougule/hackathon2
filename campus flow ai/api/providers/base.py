from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GeneratedContent:
    text: str
    provider: str
    model: str


class AIProvider(ABC):
    @abstractmethod
    async def generate_text(
        self,
        *,
        system_instructions: str,
        verified_context: str,
        student_request: str,
    ) -> GeneratedContent:
        raise NotImplementedError

    @abstractmethod
    async def generate_structured(
        self,
        *,
        system_instructions: str,
        verified_context: str,
        student_request: str,
        response_schema: dict[str, Any],
    ) -> GeneratedContent:
        raise NotImplementedError
