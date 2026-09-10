from functools import lru_cache

from api.core.config import get_settings
from api.core.errors import ProviderUnavailableError
from api.providers.base import AIProvider
from api.providers.gemini import GeminiProvider


@lru_cache
def get_ai_provider() -> AIProvider:
    settings = get_settings()
    if settings.ai_provider.lower() == "gemini":
        return GeminiProvider(settings)
    raise ProviderUnavailableError()
