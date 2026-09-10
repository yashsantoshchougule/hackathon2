import asyncio
from types import SimpleNamespace

import pytest

from api.core import security
from api.core.config import Settings
from api.dependencies import auth


@pytest.mark.parametrize("header", [None, "", "Basic abc", "Bearer", "Bearer a b"])
def test_bearer_parser_rejects_malformed_headers(header):
    with pytest.raises(security.AuthenticationError) as error:
        security.extract_bearer_token(header)
    assert error.value.status_code == 401


def test_verified_claims_requires_issuer_audience_and_expiry(monkeypatch):
    monkeypatch.setattr(security, "get_settings", lambda: Settings("https://project.supabase.co", "secret", "authenticated", "http://localhost:5173"))
    claims = {"sub": "00000000-0000-0000-0000-000000000001", "iss": "https://project.supabase.co/auth/v1", "aud": "authenticated", "exp": 4102444800}
    monkeypatch.setattr(security, "get_service_client", lambda: SimpleNamespace(auth=SimpleNamespace(get_claims=lambda _: SimpleNamespace(claims=claims))))
    assert security.verified_claims("verified-token") == claims
    claims["aud"] = "wrong"
    with pytest.raises(security.AuthenticationError):
        security.verified_claims("verified-token")


def test_current_user_uses_canonical_database_role(monkeypatch):
    monkeypatch.setattr(auth, "verified_claims", lambda _: {"sub": "00000000-0000-0000-0000-000000000001", "email": "student@example.test"})
    query = SimpleNamespace(select=lambda *_: query, eq=lambda *_: query, limit=lambda *_: query, execute=lambda: SimpleNamespace(data=[{"role": "student"}]))
    monkeypatch.setattr(auth, "get_service_client", lambda: SimpleNamespace(table=lambda _: query))
    user = asyncio.run(auth.get_current_user("Bearer verified-token"))
    assert str(user.id) == "00000000-0000-0000-0000-000000000001"
    assert user.role == "student"
    with pytest.raises(security.AuthenticationError) as error:
        asyncio.run(auth.require_admin(user))
    assert error.value.status_code == 403
