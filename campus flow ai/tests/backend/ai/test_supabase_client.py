import pytest

from api.core.config import Settings
from api.core.errors import AppError
from api.core.supabase_client import SupabaseClient


class AnonymousResponse:
    status_code = 200
    is_error = False

    @staticmethod
    def json():
        return {
            "id": "anonymous-user",
            "is_anonymous": True,
            "app_metadata": {"provider": "anonymous"},
        }


class AuthHttpClient:
    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, *_args, **_kwargs):
        return AnonymousResponse()


@pytest.mark.asyncio
async def test_anonymous_supabase_user_is_not_used_as_student(monkeypatch) -> None:
    monkeypatch.setattr("api.core.supabase_client.httpx.AsyncClient", AuthHttpClient)
    client = SupabaseClient(
        Settings(supabase_url="https://project.supabase.co", supabase_publishable_key="publishable"),
        "anonymous-access-token",
    )
    with pytest.raises(AppError) as exc:
        await client.verify_user()
    assert exc.value.code == "PERMANENT_ACCOUNT_REQUIRED"
