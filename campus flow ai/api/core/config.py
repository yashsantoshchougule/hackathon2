from dataclasses import dataclass
from functools import lru_cache
import os


class ConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_audience: str
    frontend_url: str


@lru_cache
def get_settings() -> Settings:
    values = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL", "").rstrip("/"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "SUPABASE_JWT_AUDIENCE": os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
        "FRONTEND_URL": os.getenv("FRONTEND_URL", "").rstrip("/"),
    }
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise ConfigurationError(f"Missing required configuration: {', '.join(missing)}")
    if not values["SUPABASE_URL"].startswith("https://"):
        raise ConfigurationError("SUPABASE_URL must use https.")
    if not values["FRONTEND_URL"].startswith(("http://", "https://")):
        raise ConfigurationError("FRONTEND_URL must be an http(s) URL.")
    return Settings(
        supabase_url=values["SUPABASE_URL"],
        supabase_service_role_key=values["SUPABASE_SERVICE_ROLE_KEY"],
        supabase_jwt_audience=values["SUPABASE_JWT_AUDIENCE"],
        frontend_url=values["FRONTEND_URL"],
    )
