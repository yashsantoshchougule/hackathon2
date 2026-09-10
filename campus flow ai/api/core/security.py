from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings
from .errors import AppError
from .supabase_client import SupabaseClient, VerifiedUser, get_service_client


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


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None
    role: str
    access_token: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401, "AUTH_REQUIRED", "Authentication is required.")
    client = SupabaseClient(settings, credentials.credentials)
    verified: VerifiedUser = await client.verify_user()
    return AuthenticatedUser(
        id=verified.id,
        email=verified.email,
        role=verified.role,
        access_token=credentials.credentials,
    )


def require_roles(*allowed: str):
    async def dependency(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed:
            raise AppError(403, "INSUFFICIENT_PERMISSIONS", "You do not have permission to use this feature.")
        return user

    return dependency


require_student = require_roles("student")
