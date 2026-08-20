import asyncio
import json
from typing import Any

import httpx
from pydantic import ValidationError

from vishwavaani_api.config import Settings, get_settings
from vishwavaani_api.errors import APIError
from vishwavaani_api.schemas import SemanticEvaluation


class ProviderAdapter:
    """Provider-neutral adapter for an OpenAI-compatible chat/audio API.

    Live missions are turn-based, not a persistent realtime connection: the browser records a
    clip, this adapter transcribes it, drives the mission conversation through tool-calling chat
    completions, then synthesizes the reply. FastAPI still never stores raw audio.
    """

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

    async def transcribe(self, *, audio_bytes: bytes, filename: str, content_type: str) -> str:
        """Speech-to-text for one learner turn."""
        async with self._semaphore:
            try:
                response = await self._client.post(
                    self._url(self.settings.ai_transcriptions_path),
                    headers=self._headers(),
                    data={"model": self.settings.ai_transcription_model},
                    files={"file": (filename, audio_bytes, content_type)},
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
                    code="provider_transcription_failed",
                    message="We could not hear that clearly. Please try again.",
                    status_code=502,
                    retryable=exc.response.status_code >= 500,
                ) from exc

            text = response.json().get("text")
            if not isinstance(text, str):
                raise APIError(
                    code="provider_transcription_failed",
                    message="We could not hear that clearly. Please try again.",
                    status_code=502,
                    retryable=True,
                    retry_after_seconds=2,
                )
            return text

    async def mission_completion(
        self,
        *,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """One chat-completion step of the mission conversation. Returns the raw assistant message
        (content and/or tool_calls); the tool-calling loop lives in conversation.py."""
        payload: dict[str, Any] = {
            "model": self.settings.ai_mission_model,
            "temperature": 0.4,
            "messages": messages,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        async with self._semaphore:
            try:
                response = await self._client.post(
                    self._url(self.settings.ai_chat_completions_path),
                    headers={**self._headers(), "Content-Type": "application/json"},
                    json=payload,
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
                    code="provider_rejected_turn",
                    message="The live voice service could not continue this mission.",
                    status_code=502,
                    retryable=exc.response.status_code >= 500,
                ) from exc

            try:
                return response.json()["choices"][0]["message"]
            except (KeyError, IndexError, ValueError) as exc:
                raise APIError(
                    code="provider_rejected_turn",
                    message="The live voice service could not continue this mission.",
                    status_code=502,
                    retryable=True,
                    retry_after_seconds=2,
                ) from exc

    async def synthesize(self, *, text: str) -> bytes:
        """Text-to-speech for one agent reply. Returns raw audio bytes (provider-chosen format)."""
        async with self._semaphore:
            try:
                response = await self._client.post(
                    self._url(self.settings.ai_speech_path),
                    headers={**self._headers(), "Content-Type": "application/json"},
                    json={
                        "model": self.settings.ai_tts_model,
                        "voice": self.settings.ai_tts_voice,
                        "input": text,
                    },
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
                    code="provider_speech_failed",
                    message="The live voice service could not speak its reply.",
                    status_code=502,
                    retryable=exc.response.status_code >= 500,
                ) from exc
            return response.content

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

    async def conformance_probe(self) -> dict[str, bool]:
        """Best-effort end-to-end check of each provider leg (speech out, speech in, tool-calling),
        used by the admin conformance endpoint and scripts/provider_conformance.py."""
        checks = {"speech_synthesis": False, "speech_transcription": False, "tool_calls": False}
        try:
            audio = await self.synthesize(text="Conformance check.")
            checks["speech_synthesis"] = bool(audio)
        except APIError:
            return checks

        try:
            transcript = await self.transcribe(
                audio_bytes=audio, filename="probe.mp3", content_type="audio/mpeg"
            )
            checks["speech_transcription"] = bool(transcript.strip())
        except APIError:
            pass

        try:
            message = await self.mission_completion(
                messages=[{"role": "user", "content": "Call the conformance_complete tool now."}],
                tools=[
                    {
                        "type": "function",
                        "function": {
                            "name": "conformance_complete",
                            "description": "Confirm tool-calling is supported.",
                            "parameters": {"type": "object", "properties": {}},
                        },
                    }
                ],
            )
            checks["tool_calls"] = bool(message.get("tool_calls"))
        except APIError:
            pass

        return checks

    async def close(self) -> None:
        await self._client.aclose()
