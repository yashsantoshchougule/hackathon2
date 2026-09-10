from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.core.config import get_settings
from api.core.security import AuthenticationError
from api.dependencies.auth import get_current_user
from api.models.auth import AuthenticatedUser


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_settings()  # Validate before accepting a request; never log secrets.
    yield


app = FastAPI(title="CampusFlow API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[get_settings().frontend_url], allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"])


@app.middleware("http")
async def request_id(request: Request, call_next):
    request.state.request_id = str(uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(AuthenticationError)
async def authentication_error(request: Request, exc: AuthenticationError):
    code = "AUTHENTICATION_REQUIRED" if exc.status_code == 401 else "AUTHORIZATION_FAILED" if exc.status_code == 403 else "SERVICE_UNAVAILABLE"
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": code, "message": exc.message, "request_id": getattr(request.state, "request_id", str(uuid4()))}})


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/me")
async def current_user(user: AuthenticatedUser = Depends(get_current_user)):
    return user
