from datetime import timedelta
from typing import Any

from fastapi import Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vishwavaani_api.errors import APIError
from vishwavaani_api.models import IdempotencyRecord, utcnow
from vishwavaani_api.security import fingerprint


async def require_idempotency_key(
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> str:
    if not idempotency_key or len(idempotency_key) < 8 or len(idempotency_key) > 128:
        raise APIError(
            code="idempotency_key_required",
            message="Provide an Idempotency-Key between 8 and 128 characters.",
            status_code=400,
        )
    return idempotency_key


async def replay_or_conflict(
    db: AsyncSession,
    *,
    actor_key: str,
    operation: str,
    key: str,
    payload: Any,
) -> dict[str, Any] | None:
    existing = await db.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.actor_key == actor_key,
            IdempotencyRecord.operation == operation,
            IdempotencyRecord.idempotency_key == key,
        )
    )
    if existing is None:
        return None
    if existing.request_fingerprint != fingerprint(payload):
        raise APIError(
            code="idempotency_key_reused",
            message="That Idempotency-Key was already used for a different request.",
            status_code=409,
        )
    return existing.response_body


def remember(
    db: AsyncSession,
    *,
    actor_key: str,
    operation: str,
    key: str,
    payload: Any,
    response_body: dict[str, Any],
    response_status: int = 200,
) -> None:
    db.add(
        IdempotencyRecord(
            actor_key=actor_key,
            operation=operation,
            idempotency_key=key,
            request_fingerprint=fingerprint(payload),
            response_status=response_status,
            response_body=response_body,
            expires_at=utcnow() + timedelta(hours=24),
        )
    )
