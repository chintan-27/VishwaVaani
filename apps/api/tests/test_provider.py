import httpx
import pytest
from vishwavaani_api.config import Settings
from vishwavaani_api.errors import APIError
from vishwavaani_api.provider import ProviderAdapter


def provider_settings() -> Settings:
    return Settings(
        app_env="test",
        ai_base_url="https://provider.example",
        ai_api_key="secret",
        ai_mission_model="mission",
        ai_evaluator_model="evaluator",
        ai_transcription_model="whisper-large-v3",
        ai_tts_model="kokoro",
    )


@pytest.mark.asyncio
async def test_transcription_uses_openai_compatible_contract() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer secret"
        assert request.url.path == "/v1/audio/transcriptions"
        body = request.content.decode("utf-8", errors="ignore")
        assert 'name="model"' in body
        assert "whisper-large-v3" in body
        return httpx.Response(200, json={"text": "I am here for a holiday."})

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    transcript = await adapter.transcribe(
        audio_bytes=b"fake-audio", filename="turn.webm", content_type="audio/webm"
    )
    await adapter.close()
    assert transcript == "I am here for a holiday."


@pytest.mark.asyncio
async def test_malformed_transcription_response_fails_closed() -> None:
    adapter = ProviderAdapter(
        provider_settings(),
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json={"oops": True})),
    )
    with pytest.raises(APIError) as error:
        await adapter.transcribe(audio_bytes=b"x", filename="turn.webm", content_type="audio/webm")
    await adapter.close()
    assert error.value.code == "provider_transcription_failed"


@pytest.mark.asyncio
async def test_transcription_server_error_is_retryable() -> None:
    adapter = ProviderAdapter(
        provider_settings(),
        transport=httpx.MockTransport(lambda request: httpx.Response(500, text="boom")),
    )
    with pytest.raises(APIError) as error:
        await adapter.transcribe(audio_bytes=b"x", filename="turn.webm", content_type="audio/webm")
    await adapter.close()
    assert error.value.code == "provider_transcription_failed"
    assert error.value.retryable is True


@pytest.mark.asyncio
async def test_mission_completion_sends_tools_and_tool_choice_when_provided() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        import json as jsonlib

        body = jsonlib.loads(request.content)
        assert body["model"] == "mission"
        assert body["tools"][0]["function"]["name"] == "record_slot"
        assert body["tool_choice"] == "auto"
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "tool_calls": [
                                {
                                    "id": "call-1",
                                    "function": {
                                        "name": "record_slot",
                                        "arguments": '{"slot": "purpose"}',
                                    },
                                }
                            ],
                        }
                    }
                ]
            },
        )

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    message = await adapter.mission_completion(
        messages=[{"role": "user", "content": "I am here for a holiday."}],
        tools=[
            {
                "type": "function",
                "function": {"name": "record_slot", "parameters": {"type": "object"}},
            }
        ],
    )
    await adapter.close()
    assert message["tool_calls"][0]["function"]["name"] == "record_slot"


@pytest.mark.asyncio
async def test_mission_completion_omits_tools_when_none_given() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        import json as jsonlib

        body = jsonlib.loads(request.content)
        assert "tools" not in body
        assert "tool_choice" not in body
        return httpx.Response(
            200,
            json={"choices": [{"message": {"role": "assistant", "content": "Welcome."}}]},
        )

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    message = await adapter.mission_completion(
        messages=[{"role": "user", "content": "hi"}], tools=[]
    )
    await adapter.close()
    assert message["content"] == "Welcome."


@pytest.mark.asyncio
async def test_mission_completion_server_error_is_retryable() -> None:
    adapter = ProviderAdapter(
        provider_settings(),
        transport=httpx.MockTransport(lambda request: httpx.Response(500, text="boom")),
    )
    with pytest.raises(APIError) as error:
        await adapter.mission_completion(messages=[], tools=[])
    await adapter.close()
    assert error.value.code == "provider_rejected_turn"
    assert error.value.retryable is True


@pytest.mark.asyncio
async def test_synthesize_returns_provider_audio_bytes() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/audio/speech"
        return httpx.Response(
            200, content=b"fake-mp3-bytes", headers={"content-type": "audio/mpeg"}
        )

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    audio = await adapter.synthesize(text="Welcome.")
    await adapter.close()
    assert audio == b"fake-mp3-bytes"


@pytest.mark.asyncio
async def test_invalid_evaluator_json_stays_pending() -> None:
    import json

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


@pytest.mark.asyncio
async def test_conformance_probe_reports_each_leg_independently() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/audio/speech":
            return httpx.Response(200, content=b"audio", headers={"content-type": "audio/mpeg"})
        if request.url.path == "/v1/audio/transcriptions":
            return httpx.Response(500, text="transcription down")
        if request.url.path == "/v1/chat/completions":
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "tool_calls": [
                                    {
                                        "id": "1",
                                        "function": {
                                            "name": "conformance_complete",
                                            "arguments": "{}",
                                        },
                                    }
                                ],
                            }
                        }
                    ]
                },
            )
        return httpx.Response(404)

    adapter = ProviderAdapter(provider_settings(), transport=httpx.MockTransport(handler))
    checks = await adapter.conformance_probe()
    await adapter.close()
    assert checks == {
        "speech_synthesis": True,
        "speech_transcription": False,
        "tool_calls": True,
    }
