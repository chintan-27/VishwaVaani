import httpx

from vishwavaani_api.config import Settings
from vishwavaani_api.errors import APIError


async def send_sign_in_code(email: str, code: str, settings: Settings) -> None:
    if not settings.resend_api_key:
        if settings.app_env in {"local", "test"}:
            return
        raise APIError(
            code="email_unavailable",
            message="Sign-in email is temporarily unavailable.",
            status_code=503,
            retryable=True,
            retry_after_seconds=30,
        )

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.resend_from_email,
                    "to": [email],
                    "subject": "Your VishwaVaani sign-in code",
                    "html": (
                        "<p>Your VishwaVaani sign-in code is:</p>"
                        f"<p style='font-size:28px;font-weight:700;letter-spacing:6px'>{code}</p>"
                        f"<p>It expires in {settings.auth_code_ttl_minutes} minutes. "
                        "If you did not request it, you can ignore this email.</p>"
                    ),
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise APIError(
                code="email_unavailable",
                message="Sign-in email is temporarily unavailable.",
                status_code=503,
                retryable=True,
                retry_after_seconds=30,
            ) from exc
