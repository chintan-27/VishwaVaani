import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class APIError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        retryable: bool = False,
        retry_after_seconds: int | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.retry_after_seconds = retry_after_seconds
        super().__init__(message)


def request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid.uuid4()))


def error_payload(
    request: Request,
    *,
    code: str,
    message: str,
    retryable: bool,
    retry_after_seconds: int | None = None,
) -> dict[str, Any]:
    detail: dict[str, Any] = {
        "code": code,
        "message": message,
        "retryable": retryable,
        "request_id": request_id(request),
    }
    if retry_after_seconds is not None:
        detail["retry_after_seconds"] = retry_after_seconds
    return {"error": detail}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def handle_api_error(request: Request, exc: APIError) -> JSONResponse:
        headers = {}
        if exc.retry_after_seconds is not None:
            headers["Retry-After"] = str(exc.retry_after_seconds)
        return JSONResponse(
            status_code=exc.status_code,
            headers=headers,
            content=error_payload(
                request,
                code=exc.code,
                message=exc.message,
                retryable=exc.retryable,
                retry_after_seconds=exc.retry_after_seconds,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload(
                request,
                code="validation_failed",
                message="Some supplied information was not valid.",
                retryable=False,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_payload(
                request,
                code="internal_error",
                message="VishwaVaani could not complete that request.",
                retryable=True,
            ),
        )
