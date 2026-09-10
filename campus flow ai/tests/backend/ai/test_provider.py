import pytest
import httpx

from api.core.config import Settings
from api.core.errors import AppError
from api.providers.gemini import GeminiProvider


class Response:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    @property
    def is_error(self):
        return self.status_code >= 400

    def json(self):
        return self._payload


class FakeHttpClient:
    responses = []
    urls = []

    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, url, **_kwargs):
        self.urls.append(url)
        return self.responses.pop(0)


@pytest.mark.asyncio
async def test_retryable_failure_uses_configured_fallback(monkeypatch) -> None:
    FakeHttpClient.responses = [
        Response(500),
        Response(200, {"candidates": [{"content": {"parts": [{"text": "fallback answer"}]}}]}),
    ]
    FakeHttpClient.urls = []
    monkeypatch.setattr("api.providers.gemini.httpx.AsyncClient", FakeHttpClient)
    provider = GeminiProvider(Settings(
        gemini_api_key="test-key", ai_model_primary="primary-model",
        ai_model_fallbacks="fallback-model", ai_max_retries=0,
    ))
    result = await provider.generate_text(
        system_instructions="Ground answers", verified_context="fact", student_request="question"
    )
    assert result.model == "fallback-model"
    assert len(FakeHttpClient.urls) == 2


@pytest.mark.asyncio
async def test_invalid_key_is_not_retried(monkeypatch) -> None:
    FakeHttpClient.responses = [Response(401)]
    FakeHttpClient.urls = []
    monkeypatch.setattr("api.providers.gemini.httpx.AsyncClient", FakeHttpClient)
    provider = GeminiProvider(Settings(
        gemini_api_key="bad-key", ai_model_primary="primary-model",
        ai_model_fallbacks="fallback-model", ai_max_retries=2,
    ))
    with pytest.raises(AppError) as exc:
        await provider.generate_text(
            system_instructions="Ground answers", verified_context="fact", student_request="question"
        )
    assert exc.value.code == "AI_PROVIDER_CONFIGURATION_ERROR"
    assert len(FakeHttpClient.urls) == 1


class TimeoutHttpClient(FakeHttpClient):
    async def post(self, url, **_kwargs):
        self.urls.append(url)
        raise httpx.ReadTimeout("provider timed out")


@pytest.mark.asyncio
async def test_provider_timeout_returns_controlled_unavailable(monkeypatch) -> None:
    TimeoutHttpClient.urls = []
    monkeypatch.setattr("api.providers.gemini.httpx.AsyncClient", TimeoutHttpClient)
    provider = GeminiProvider(Settings(
        gemini_api_key="test-key", ai_model_primary="primary-model", ai_max_retries=0,
    ))
    with pytest.raises(AppError) as exc:
        await provider.generate_text(
            system_instructions="Ground answers", verified_context="fact", student_request="question"
        )
    assert exc.value.code == "AI_PROVIDER_UNAVAILABLE"
