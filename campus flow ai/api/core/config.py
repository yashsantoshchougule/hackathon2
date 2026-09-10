from dataclasses import dataclass
from functools import lru_cache
import os

@dataclass(frozen=True)
class Settings:
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_audience: str = "authenticated"
    frontend_url: str = "http://localhost:5173"
    supabase_publishable_key: str = ""
    supabase_anon_key: str = ""

    ai_provider: str = "gemini"
    ai_model_primary: str = ""
    ai_model_fallbacks: str = ""
    ai_request_timeout_seconds: float = 45
    ai_max_retries: int = 2
    gemini_api_key: str = ""

    allowed_origins: str = "http://localhost:5173"
    max_upload_bytes: int = 10 * 1024 * 1024
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
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_jwt_audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/"),
        supabase_publishable_key=os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        ai_provider=os.getenv("AI_PROVIDER", "gemini"),
        ai_model_primary=os.getenv("AI_MODEL_PRIMARY", ""),
        ai_model_fallbacks=os.getenv("AI_MODEL_FALLBACKS", ""),
        ai_request_timeout_seconds=float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "45")),
        ai_max_retries=int(os.getenv("AI_MAX_RETRIES", "2")),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        allowed_origins=os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_URL", "http://localhost:5173")),
        max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))),
        notice_storage_bucket=os.getenv("NOTICE_STORAGE_BUCKET", "notices"),
        resource_storage_bucket=os.getenv("RESOURCE_STORAGE_BUCKET", "resources"),
    )
