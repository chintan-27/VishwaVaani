import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from vishwavaani_api.api import router
from vishwavaani_api.config import get_settings
from vishwavaani_api.database import engine
from vishwavaani_api.errors import install_error_handlers
from vishwavaani_api.models import Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if settings.app_env in {"local", "test"}:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="VishwaVaani API",
    version="0.1.0",
    description=(
        "Reusable session, realtime control, evaluation, progress, and privacy contracts for "
        "VishwaVaani web and future native clients."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_public_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
)


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    incoming = request.headers.get("X-Request-ID")
    request.state.request_id = incoming if incoming and len(incoming) <= 64 else str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["Cache-Control"] = "no-store"
    return response


install_error_handlers(app)
app.include_router(router)
