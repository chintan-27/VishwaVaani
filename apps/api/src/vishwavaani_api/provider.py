import asyncio
import json
from collections.abc import Iterable
from typing import Any

import httpx
from pydantic import ValidationError

from vishwavaani_api.config import Settings, get_settings
from vishwavaani_api.errors import APIError
from vishwavaani_api.schemas import SemanticEvaluation

REQUIRED_REALTIME_EVENT_TYPES = {
    "session.created",
    "session.updated",
    "input_audio_buffer.speech_started",
    "input_audio_buffer.speech_stopped",
    "response.output_audio.delta",
    "response.function_call_arguments.done",
}


class ProviderAdapter:
    """Provider-neutral adapter for OpenAI-compatible Realtime and Chat Completions."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._semaphore = asyncio.Semaphore(self.settings.ai_max_concurrency)
        timeout = httpx.Timeout(
            connect=self.settings.ai_connect_timeout_seconds,
            read=self.settings.ai_read_timeout_seconds,
            write=self.settings.ai_read_timeout_seconds,
            pool=self.settings.ai_connect_timeout_seconds,
        )
        self._client = httpx.AsyncClient(timeout=timeout, transport=transport)

    def _url(self, path: str) -> str:
        if not self.settings.ai_base_url:
            raise APIError(
                code="provider_not_configured",
                message=(
                    "Live missions are not available yet. The scripted preview is still available."
                ),
                status_code=503,
                retryable=False,
            )
        return f"{self.settings.ai_base_url.rstrip('/')}/{path.lstrip('/')}"

    def _headers(self) -> dict[str, str]:
        if not self.settings.ai_api_key:
            raise APIError(
                code="provider_not_configured",
                message=(
                    "Live missions are not available yet. The scripted preview is still available."
                ),
                status_code=503,
            )
        return {"Authorization": f"Bearer {self.settings.ai_api_key}"}

    async def exchange_sdp(
        self,
        *,
        offer_sdp: str,
        instructions: str,
        tools: list[dict[str, Any]],
    ) -> tuple[str, str | None]:
        async with self._semaphore:
            headers = {
                **self._headers(),
                "Content-Type": "application/sdp",
                "X-VishwaVaani-Instructions": instructions,
                "X-VishwaVaani-Tools": ",".join(str(tool.get("name", "")) for tool in tools),
            }
            try:
                response = await self._client.post(
                    self._url(self.settings.ai_realtime_calls_path),
                    params={"model": self.settings.ai_realtime_model},
                    headers=headers,
                    content=offer_sdp.encode("utf-8"),
                )
                response.raise_for_status()
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                raise APIError(
                    code="provider_timeout",
                    message="The live voice service did not respond in time.",
                    status_code=504,
                    retryable=True,
                    retry_after_seconds=5,
                ) from exc
            except httpx.HTTPStatusError as exc:
                raise APIError(
                    code="provider_rejected_offer",
                    message="The live voice service could not start this mission.",
                    status_code=502,
                    retryable=exc.response.status_code >= 500,
                ) from exc

            answer = response.text
            if "v=0" not in answer or "m=audio" not in answer:
                raise APIError(
                    code="provider_invalid_sdp",
                    message="The live voice service returned an invalid connection response.",
                    status_code=502,
                )
            call_id = response.headers.get("OpenAI-Call-Id") or response.headers.get("X-Call-Id")
            return answer, call_id

    async def send_sideband_control(self, *, call_id: str, event: dict[str, Any]) -> bool:
        path = self.settings.ai_realtime_sideband_path.format(call_id=call_id)
        try:
            response = await self._client.post(
                self._url(path),
                headers={**self._headers(), "Content-Type": "application/json"},
                json=event,
            )
            response.raise_for_status()
            return True
        except httpx.HTTPError:
            return False

    async def evaluate(
        self,
        *,
        transcript: list[dict[str, Any]],
        deterministic_evidence: dict[str, Any],
        frozen_rubric_version: str,
    ) -> SemanticEvaluation:
        schema = SemanticEvaluation.model_json_schema()
        payload = {
            "model": self.settings.ai_evaluator_model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Evaluate semantic comprehension and meaning-affecting language only. "
                        "Do not infer clarity from ASR confidence alone. Credit successful repair "
                        "language. Never recommend accent erasure."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "rubric_version": frozen_rubric_version,
                            "transcript": transcript,
                            "deterministic_evidence": deterministic_evidence,
                        },
                        separators=(",", ":"),
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "vishwavaani_evaluation",
                    "strict": True,
                    "schema": schema,
                },
            },
        }
        async with self._semaphore:
            try:
                response = await self._client.post(
                    self._url(self.settings.ai_chat_completions_path),
                    headers={**self._headers(), "Content-Type": "application/json"},
                    json=payload,
                )
                response.raise_for_status()
                body = response.json()
                content = body["choices"][0]["message"]["content"]
                return SemanticEvaluation.model_validate_json(content)
            except (KeyError, TypeError, ValueError, ValidationError) as exc:
                raise APIError(
                    code="invalid_evaluator_output",
                    message="Feedback is still being prepared.",
                    status_code=502,
                    retryable=True,
                    retry_after_seconds=5,
                ) from exc
            except httpx.HTTPError as exc:
                raise APIError(
                    code="evaluator_unavailable",
                    message="Feedback is still being prepared.",
                    status_code=502,
                    retryable=True,
                    retry_after_seconds=5,
                ) from exc

    async def close(self) -> None:
        await self._client.aclose()


def validate_realtime_events(events: Iterable[dict[str, Any]]) -> dict[str, bool]:
    observed = {
        event.get("type")
        for event in events
        if isinstance(event, dict) and isinstance(event.get("type"), str)
    }
    return {
        "data_channel_events": "session.created" in observed,
        "server_instructions": "session.updated" in observed,
        "vad": {
            "input_audio_buffer.speech_started",
            "input_audio_buffer.speech_stopped",
        }.issubset(observed),
        "audio_output": "response.output_audio.delta" in observed,
        "tool_calls": "response.function_call_arguments.done" in observed,
    }
