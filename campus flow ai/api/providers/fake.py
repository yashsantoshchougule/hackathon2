import json
from collections.abc import Callable
from typing import Any

from api.providers.base import AIProvider, GeneratedContent


class FakeAIProvider(AIProvider):
    """Test-only provider that never consumes external credits."""

    def __init__(self, response: str | dict[str, Any] | Callable[..., str] = "Grounded test answer") -> None:
        self.response = response
        self.calls: list[dict[str, Any]] = []

    def _content(self, kwargs: dict[str, Any]) -> GeneratedContent:
        self.calls.append(kwargs)
        value = self.response(**kwargs) if callable(self.response) else self.response
        text = json.dumps(value) if isinstance(value, dict) else value
        return GeneratedContent(text=text, provider="fake", model="fake-test-model")

    async def generate_text(self, **kwargs: Any) -> GeneratedContent:
        return self._content(kwargs)

    async def generate_structured(self, **kwargs: Any) -> GeneratedContent:
        return self._content(kwargs)
