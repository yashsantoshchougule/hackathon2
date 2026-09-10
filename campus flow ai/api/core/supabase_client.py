from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib.parse import quote

import httpx
from supabase import Client, ClientOptions, create_client

from .config import Settings, get_settings
from .errors import AppError, DataIntegrationError


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


@dataclass(frozen=True)
class VerifiedUser:
    id: str
    email: str | None
    role: str


class SupabaseClient:
    """Minimal REST adapter. User-token calls keep Supabase RLS enabled."""

    def __init__(self, settings: Settings, access_token: str | None = None) -> None:
        self.settings = settings
        self.access_token = access_token

    def _ensure_configured(self) -> None:
        if not self.settings.supabase_url or not self.settings.supabase_client_key:
            raise DataIntegrationError(
                "Supabase is not configured. Production AI endpoints remain closed."
            )

    @property
    def headers(self) -> dict[str, str]:
        self._ensure_configured()
        headers = {
            "apikey": self.settings.supabase_client_key,
            "Accept": "application/json",
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    async def verify_user(self) -> VerifiedUser:
        self._ensure_configured()
        if not self.access_token:
            raise AppError(401, "AUTH_REQUIRED", "Authentication is required.")
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.get(
                    f"{self.settings.supabase_url.rstrip('/')}/auth/v1/user",
                    headers=self.headers,
                )
            except httpx.RequestError as exc:
                raise AppError(503, "AUTH_SERVICE_UNAVAILABLE", "Authentication could not be verified.") from exc
        if response.status_code in (401, 403):
            raise AppError(401, "SESSION_INVALID", "Your session has expired. Please sign in again.")
        if response.is_error:
            raise AppError(503, "AUTH_SERVICE_UNAVAILABLE", "Authentication could not be verified.")
        payload = response.json()
        user_id = payload.get("id")
        if not user_id:
            raise AppError(401, "SESSION_INVALID", "Your session has expired. Please sign in again.")
        app_metadata = payload.get("app_metadata") or {}
        if payload.get("is_anonymous") is True or app_metadata.get("provider") == "anonymous":
            raise AppError(401, "PERMANENT_ACCOUNT_REQUIRED", "Please sign in with your CampusFlow account.")
        role = str(app_metadata.get("role") or "student")
        return VerifiedUser(id=str(user_id), email=payload.get("email"), role=role)

    async def select(
        self,
        table: str,
        *,
        filters: dict[str, str] | None = None,
        columns: str = "*",
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {"select": columns}
        params.update(filters or {})
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = str(limit)
        return await self._request("GET", table, params=params)

    async def insert(self, table: str, rows: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        return await self._request(
            "POST", table, json=rows, extra_headers={"Prefer": "return=representation"}
        )

    async def update(
        self, table: str, values: dict[str, Any], *, filters: dict[str, str]
    ) -> list[dict[str, Any]]:
        return await self._request(
            "PATCH",
            table,
            params=filters,
            json=values,
            extra_headers={"Prefer": "return=representation"},
        )

    async def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json: Any = None,
        extra_headers: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        if not table.replace("_", "").isalnum():
            raise ValueError("Invalid table name")
        headers = {**self.headers, "Content-Type": "application/json", **(extra_headers or {})}
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.request(
                    method,
                    f"{self.settings.supabase_url.rstrip('/')}/rest/v1/{quote(table)}",
                    headers=headers,
                    params=params,
                    json=json,
                )
            except httpx.RequestError as exc:
                raise DataIntegrationError() from exc
        if response.status_code in (401, 403):
            raise AppError(403, "DATA_ACCESS_DENIED", "You do not have permission to access this data.")
        if response.is_error:
            raise DataIntegrationError()
        if not response.content:
            return []
        payload = response.json()
        return payload if isinstance(payload, list) else [payload]

    async def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> None:
        if ".." in path or path.startswith("/"):
            raise ValueError("Invalid storage path")
        headers = {**self.headers, "Content-Type": content_type, "x-upsert": "false"}
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.post(
                    f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/{quote(bucket)}/{quote(path, safe='/')}",
                    headers=headers,
                    content=content,
                )
            except httpx.RequestError as exc:
                raise DataIntegrationError("Document storage is temporarily unavailable.") from exc
        if response.status_code == 409:
            raise AppError(409, "DUPLICATE_DOCUMENT", "This document has already been uploaded.")
        if response.status_code in (401, 403):
            raise AppError(403, "STORAGE_ACCESS_DENIED", "You do not have permission to store this document.")
        if response.is_error:
            raise DataIntegrationError("Document storage is temporarily unavailable.")
