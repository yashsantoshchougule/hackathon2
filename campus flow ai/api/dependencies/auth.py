from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Header

from api.core.security import AuthenticationError, extract_bearer_token, verified_claims
from api.core.supabase_client import get_service_client
from api.models.auth import AuthenticatedUser

VALID_ROLES = frozenset({"student", "faculty", "hod", "admin"})


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
    claims = verified_claims(extract_bearer_token(authorization))
    try:
        user_id = UUID(claims["sub"])
        result = get_service_client().table("user_roles").select("role").eq("user_id", str(user_id)).limit(1).execute()
        role = result.data[0]["role"] if result.data else None
    except (KeyError, ValueError, TypeError, IndexError) as exc:
        raise AuthenticationError() from exc
    except Exception as exc:
        raise AuthenticationError("Authorization verification is temporarily unavailable.", 503) from exc
    if role not in VALID_ROLES:
        raise AuthenticationError("Your account does not have an assigned role.", 403)
    return AuthenticatedUser(id=user_id, email=claims.get("email"), role=role)


def require_any_role(*allowed_roles: str) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    allowed = frozenset(allowed_roles)
    async def dependency(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed:
            raise AuthenticationError("You do not have permission to perform this action.", 403)
        return user
    return dependency


require_student = require_any_role("student")
require_faculty = require_any_role("faculty")
require_hod = require_any_role("hod")
require_admin = require_any_role("admin")
