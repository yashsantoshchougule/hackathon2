from dataclasses import dataclass

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.core.config import Settings, get_settings
from api.core.errors import AppError
from api.core.supabase_client import SupabaseClient, VerifiedUser


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
