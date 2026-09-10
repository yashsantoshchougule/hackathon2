from datetime import datetime, timezone
from typing import Any

from .config import get_settings
from .supabase_client import get_service_client


class AuthenticationError(Exception):
    def __init__(self, message: str = "Please sign in to continue.", status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise AuthenticationError()
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token or " " in token.strip():
        raise AuthenticationError()
    return token.strip()


def verified_claims(access_token: str) -> dict[str, Any]:
    """Use Supabase's current get_claims verification, never an unsigned decode."""
    try:
        result = get_service_client().auth.get_claims(access_token)
        claims = result.claims
    except Exception as exc:
        raise AuthenticationError("Authentication verification is temporarily unavailable.", 503) from exc
    if not isinstance(claims, dict):
        raise AuthenticationError()

    settings = get_settings()
    audience = claims.get("aud")
    valid_audience = settings.supabase_jwt_audience in audience if isinstance(audience, list) else audience == settings.supabase_jwt_audience
    expires_at = claims.get("exp")
    if (
        claims.get("iss") != f"{settings.supabase_url}/auth/v1"
        or not valid_audience
        or not isinstance(claims.get("sub"), str)
        or not isinstance(expires_at, (int, float))
        or datetime.fromtimestamp(expires_at, tz=timezone.utc) <= datetime.now(timezone.utc)
    ):
        raise AuthenticationError()
    return claims
