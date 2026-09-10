from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_publishable_key: str = ""
    # Compatibility with projects that have not migrated to publishable keys.
    supabase_anon_key: str = ""

    ai_provider: str = "gemini"
    ai_model_primary: str = ""
    ai_model_fallbacks: str = ""
    ai_request_timeout_seconds: float = Field(default=45, ge=1, le=120)
    ai_max_retries: int = Field(default=2, ge=0, le=5)
    gemini_api_key: str = ""

    allowed_origins: str = "http://localhost:5173"
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1024)
    notice_storage_bucket: str = "notices"
    resource_storage_bucket: str = "resources"

    @property
    def supabase_client_key(self) -> str:
        return self.supabase_publishable_key or self.supabase_anon_key

    @property
    def fallback_models(self) -> list[str]:
        return [item.strip() for item in self.ai_model_fallbacks.split(",") if item.strip()]

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
