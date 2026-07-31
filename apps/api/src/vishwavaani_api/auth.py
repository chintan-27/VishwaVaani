import jwt
from fastapi import Depends, Header
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
        raise APIError(
            code="authentication_required",
            message="Enter the sign-in code sent to your email to continue.",
            status_code=401,
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(
            token,
            settings.auth_secret,
            algorithms=["HS256"],
            issuer=settings.auth_issuer,
            audience="vishwavaani-web",
            options={"require": ["exp", "iat", "iss", "sub"]},
        )
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
    return AuthPrincipal(subject=subject, email=None)


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
