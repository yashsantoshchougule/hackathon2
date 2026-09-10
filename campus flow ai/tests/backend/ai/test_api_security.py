from fastapi.testclient import TestClient

from api.core.errors import AppError
from api.core.supabase_client import VerifiedUser
from api.index import app


def test_health_is_public() -> None:
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200


def test_ai_endpoint_rejects_missing_authentication() -> None:
    response = TestClient(app).post(
        "/api/assistant/chat", json={"message": "What should I do today?", "conversation_id": None}
    )
    assert response.status_code == 401
    body = response.json()["error"]
    assert body["code"] == "AUTH_REQUIRED"
    assert body["request_id"]


def test_ai_endpoint_rejects_invalid_authentication(monkeypatch) -> None:
    async def reject(_client):
        raise AppError(401, "SESSION_INVALID", "Your session has expired. Please sign in again.")

    monkeypatch.setattr("api.core.security.SupabaseClient.verify_user", reject)
    response = TestClient(app).post(
        "/api/assistant/chat",
        headers={"Authorization": "Bearer invalid-token"},
        json={"message": "What should I do today?", "conversation_id": None},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_INVALID"


def test_student_endpoint_rejects_other_roles(monkeypatch) -> None:
    async def faculty(_client):
        return VerifiedUser(id="faculty-a", email="faculty@example.edu", role="faculty")

    monkeypatch.setattr("api.core.security.SupabaseClient.verify_user", faculty)
    response = TestClient(app).get(
        "/api/dashboard/ai-summary", headers={"Authorization": "Bearer valid-faculty-token"}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"
