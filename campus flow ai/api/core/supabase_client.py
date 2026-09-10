from functools import lru_cache

from supabase import Client, ClientOptions, create_client

from .config import get_settings


def _options() -> ClientOptions:
    return ClientOptions(
        auto_refresh_token=False,
        persist_session=False,
        postgrest_client_timeout=10,
        storage_client_timeout=10,
        schema="public",
    )


@lru_cache
def get_service_client() -> Client:
    """Backend-only client. Service-role calls must enforce actor scope explicitly."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key, options=_options())


def get_user_client(access_token: str) -> Client:
    """A fresh request-scoped client whose PostgREST calls remain subject to RLS."""
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key, options=_options())
    client.postgrest.auth(access_token)
    return client


def record_privileged_action(actor_user_id: str, action: str, target_entity_type: str, target_entity_id: str | None, request_id: str | None) -> None:
    """Call from an already-authorized admin/HOD backend operation; never from React."""
    get_service_client().table("privileged_action_audit").insert({
        "actor_user_id": actor_user_id,
        "action": action,
        "target_entity_type": target_entity_type,
        "target_entity_id": target_entity_id,
        "request_id": request_id,
    }).execute()
