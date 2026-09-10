from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.core.config import get_settings
from api.core.security import AuthenticationError
from api.core.errors import AppError
from api.dependencies.auth import get_current_user
from api.models.auth import AuthenticatedUser
from api.routes import ai_dashboard, assistant, copilot, documents, notices, planner


logger = logging.getLogger("campusflow.api")
settings = get_settings()
app = FastAPI(title="CampusFlow AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "api_request",
        extra={
            "request_id": request_id,
            "feature": request.url.path,
            "duration_ms": round((time.perf_counter() - started) * 1000),
            "status": response.status_code,
        },
    )
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    payload = {"error": {"code": exc.code, "message": exc.message, "request_id": request_id}}
    if exc.details:
        payload["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content=payload, headers={"X-Request-ID": request_id})


@app.exception_handler(AuthenticationError)
async def authentication_error(request: Request, exc: AuthenticationError) -> JSONResponse:
    code = "AUTHENTICATION_REQUIRED" if exc.status_code == 401 else "AUTHORIZATION_FAILED" if exc.status_code == 403 else "SERVICE_UNAVAILABLE"
    request_id = getattr(request.state, "request_id", str(uuid4()))
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": code, "message": exc.message, "request_id": request_id}}, headers={"X-Request-ID": request_id})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    fields = [
        {"location": [str(part) for part in item["loc"]], "type": item["type"], "message": item["msg"]}
        for item in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request could not be validated.",
                "request_id": request_id,
                "details": {"fields": fields},
            }
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    logger.error(
        "api_error",
        extra={"request_id": request_id, "feature": request.url.path, "error_category": type(exc).__name__},
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "CampusFlow could not complete the request.",
                "request_id": request_id,
            }
        },
        headers={"X-Request-ID": request_id},
    )


@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "campusflow-ai"}


@app.get("/api/me")
async def current_user(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    return user


for route in (assistant.router, planner.router, notices.router, documents.router, copilot.router, ai_dashboard.router):
    app.include_router(route)
