import asyncio

import jwt
from fastapi import Depends, Header
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vishwavaani_api.config import Settings, get_settings
from vishwavaani_api.errors import APIError
from vishwavaani_api.models import User
from vishwavaani_api.schemas import AuthPrincipal
from vishwavaani_api.security import hash_value


async def require_principal(
    authorization: str | None = Header(default=None),
    x_demo_user: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthPrincipal:
    if x_demo_user and settings.app_env in {"local", "test"}:
        return AuthPrincipal(subject=f"demo:{x_demo_user}", email=None)

    if not authorization or not authorization.startswith("Bearer "):
        if not settings.auth_required and settings.app_env != "production":
            return AuthPrincipal(subject="demo:local", email=None)
        raise APIError(
            code="authentication_required",
            message="Sign in with your invited account to continue.",
            status_code=401,
        )

    if not settings.supabase_jwks_url:
        raise APIError(
            code="authentication_unavailable",
            message="Sign-in verification is temporarily unavailable.",
            status_code=503,
            retryable=True,
            retry_after_seconds=30,
        )

    token = authorization.removeprefix("Bearer ").strip()

    def decode() -> dict[str, object]:
        client = PyJWKClient(settings.supabase_jwks_url)
        key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            key.key,
            algorithms=["RS256", "ES256"],
            audience=settings.supabase_jwt_audience,
            options={"require": ["exp", "sub"]},
        )

    try:
        claims = await asyncio.to_thread(decode)
    except jwt.PyJWTError as exc:
        raise APIError(
            code="invalid_access_token",
            message="Your sign-in session is no longer valid. Please sign in again.",
            status_code=401,
        ) from exc

    subject = claims.get("sub")
    if not isinstance(subject, str):
        raise APIError(
            code="invalid_access_token",
            message="Your sign-in session is no longer valid. Please sign in again.",
            status_code=401,
        )
    email = claims.get("email")
    return AuthPrincipal(subject=subject, email=email if isinstance(email, str) else None)


async def ensure_user(
    principal: AuthPrincipal,
    db: AsyncSession,
) -> User:
    user = await db.scalar(select(User).where(User.external_auth_id == principal.subject))
    if user is None:
        user = User(
            external_auth_id=principal.subject,
            email_hash=hash_value(principal.email) if principal.email else None,
        )
        db.add(user)
        await db.flush()
    if user.access_revoked_at or user.deleted_at:
        raise APIError(
            code="account_access_revoked",
            message="This account is no longer active.",
            status_code=403,
        )
    return user
