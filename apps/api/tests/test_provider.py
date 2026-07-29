import json

import httpx
import pytest
from vishwavaani_api.config import Settings
from vishwavaani_api.errors import APIError
from vishwavaani_api.provider import ProviderAdapter, validate_realtime_events


def provider_settings() -> Settings:
    return Settings(
        app_env="test",
        ai_base_url="https://provider.example",
        ai_api_key="secret",
        ai_realtime_model="realtime",
        ai_evaluator_model="evaluator",
    )


@pytest.mark.asyncio
async def test_webrtc_sdp_exchange_uses_openai_compatible_contract() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer secret"
        assert request.headers["content-type"] == "application/sdp"
        assert request.url.params["model"] == "realtime"
        return httpx.Response(
            200,
            text="v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
            headers={"OpenAI-Call-Id": "call-123"},
        )

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    answer, call_id = await adapter.exchange_sdp(
        offer_sdp="v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
        instructions="test",
        tools=[{"name": "complete"}],
    )
    await adapter.close()
    assert "m=audio" in answer
    assert call_id == "call-123"


@pytest.mark.asyncio
async def test_malformed_provider_sdp_fails_closed() -> None:
    adapter = ProviderAdapter(
        provider_settings(),
        transport=httpx.MockTransport(lambda request: httpx.Response(200, text="not-sdp")),
    )
    with pytest.raises(APIError) as error:
        await adapter.exchange_sdp(
            offer_sdp="v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
            instructions="test",
            tools=[],
        )
    await adapter.close()
    assert error.value.code == "provider_invalid_sdp"


def test_realtime_event_conformance_requires_vad_and_tool_calls() -> None:
    checks = validate_realtime_events(
        [
            {"type": "session.created"},
            {"type": "session.updated"},
            {"type": "input_audio_buffer.speech_started"},
            {"type": "input_audio_buffer.speech_stopped"},
            {"type": "response.output_audio.delta"},
            {"type": "response.function_call_arguments.done"},
            {"unexpected": "malformed"},
        ]
    )
    assert all(checks.values())


@pytest.mark.asyncio
async def test_invalid_evaluator_json_stays_pending() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps({"not": "valid"})}}]},
        )

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    with pytest.raises(APIError) as error:
        await adapter.evaluate(
            transcript=[],
            deterministic_evidence={},
            frozen_rubric_version="v1",
        )
    await adapter.close()
    assert error.value.code == "invalid_evaluator_output"
    assert error.value.retryable is True
