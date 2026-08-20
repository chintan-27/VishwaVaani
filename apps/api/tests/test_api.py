import io
from typing import Any

import vishwavaani_api.api as api_module
from fastapi.testclient import TestClient


class ScriptedTurnAdapter:
    """Stands in for ProviderAdapter in the turn endpoints, without a network call."""

    def __init__(
        self,
        mission_responses: list[dict[str, Any]],
        *,
        transcript: str = "I am here for a holiday.",
    ) -> None:
        self.mission_responses = list(mission_responses)
        self.transcript = transcript

    async def transcribe(self, **kwargs: Any) -> str:
        return self.transcript

    async def mission_completion(self, **kwargs: Any) -> dict[str, Any]:
        return self.mission_responses.pop(0)

    async def synthesize(self, **kwargs: Any) -> bytes:
        return b"fake-audio-bytes"

    async def close(self) -> None:
        return None


def test_email_code_sign_in_creates_a_valid_access_token(client: TestClient) -> None:
    requested = client.post("/v1/auth/code", json={"email": "learner@example.com"})
    assert requested.status_code == 200
    code = requested.json()["dev_code"]
    assert isinstance(code, str) and len(code) == 6

    verified = client.post(
        "/v1/auth/code/verify",
        json={"email": "LEARNER@example.com", "code": code},
    )
    assert verified.status_code == 200
    token = verified.json()["access_token"]

    bootstrap = client.get("/v1/bootstrap", headers={"Authorization": f"Bearer {token}"})
    assert bootstrap.status_code == 200
    assert bootstrap.json()["onboarding_completed"] is False


def test_health_exposes_provider_gate(client: TestClient) -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["live_missions_enabled"] is True
    assert response.headers["X-Request-ID"]


def test_waitlist_minimizes_repeat_submissions(client: TestClient) -> None:
    payload = {
        "email": "Traveler@example.com",
        "goal": "travel",
        "is_adult": True,
    }
    first = client.post("/v1/waitlist", json=payload)
    repeat = client.post("/v1/waitlist", json={**payload, "email": "traveler@example.com"})
    assert first.json() == {"status": "accepted"}
    assert repeat.json() == {"status": "already_registered"}


def test_waitlist_rejects_minors(client: TestClient) -> None:
    response = client.post(
        "/v1/waitlist",
        json={
            "email": "young@example.com",
            "goal": "study",
            "is_adult": False,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_failed"
    assert "request_id" in response.json()["error"]


def test_invite_claim_requires_idempotency(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/v1/invites/claim",
        headers=auth_headers,
        json={"code": "VAANI-DEMO", "age_confirmed": True},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "idempotency_key_required"


def test_session_creation_freezes_versions_and_replays(
    client: TestClient, ready_learner: dict[str, str]
) -> None:
    headers = {**ready_learner, "Idempotency-Key": "session-create-one"}
    payload = {
        "mission_slug": "us-immigration",
        "mode": "coach",
        "hint_locale": "hi-IN",
        "caption_assisted": False,
    }
    first = client.post("/v1/sessions", headers=headers, json=payload)
    repeat = client.post("/v1/sessions", headers=headers, json=payload)
    assert first.status_code == 201
    assert repeat.status_code == 201
    assert first.json()["session_id"] == repeat.json()["session_id"]
    assert set(first.json()["frozen_versions"]) == {
        "mission",
        "prompt",
        "rubric",
        "localization",
        "realtime_model",
        "evaluator_model",
        "transcription_model",
    }


def test_idempotency_key_cannot_change_payload(
    client: TestClient, ready_learner: dict[str, str]
) -> None:
    headers = {**ready_learner, "Idempotency-Key": "session-create-two"}
    first = client.post(
        "/v1/sessions",
        headers=headers,
        json={
            "mission_slug": "hotel-check-in",
            "mode": "coach",
            "hint_locale": "ta-IN",
        },
    )
    assert first.status_code == 201
    changed = client.post(
        "/v1/sessions",
        headers=headers,
        json={
            "mission_slug": "missing-baggage",
            "mode": "coach",
            "hint_locale": "ta-IN",
        },
    )
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "idempotency_key_reused"


def test_completed_session_queues_evaluation(
    client: TestClient, ready_learner: dict[str, str]
) -> None:
    session = client.post(
        "/v1/sessions",
        headers={**ready_learner, "Idempotency-Key": "session-create-three"},
        json={
            "mission_slug": "asking-directions",
            "mode": "real_world",
            "hint_locale": "bn-IN",
        },
    ).json()
    completion = client.post(
        f"/v1/sessions/{session['session_id']}/complete",
        headers={**ready_learner, "Idempotency-Key": "session-complete-three"},
        json={"final_sequence": 0, "reason": "completed"},
    )
    assert completion.status_code == 200
    assert completion.json()["status"] == "evaluation-pending"
    evaluation = client.get(
        f"/v1/sessions/{session['session_id']}/evaluation",
        headers=ready_learner,
    )
    assert evaluation.json()["status"] == "pending"


def test_privacy_deletion_revokes_access_immediately(
    client: TestClient, ready_learner: dict[str, str]
) -> None:
    export = client.post(
        "/v1/privacy/exports",
        headers={**ready_learner, "Idempotency-Key": "export-learner-one"},
    )
    assert export.status_code == 200
    assert export.json()["data"]["profile"]["onboarding_completed"] is True

    deletion = client.post(
        "/v1/privacy/deletion",
        headers={**ready_learner, "Idempotency-Key": "delete-learner-one"},
    )
    assert deletion.status_code == 200
    assert deletion.json()["status"] == "completed"
    bootstrap = client.get("/v1/bootstrap", headers=ready_learner)
    assert bootstrap.status_code == 403
    assert bootstrap.json()["error"]["code"] == "account_access_revoked"


def test_turn_start_then_audio_turn_records_transcripts_and_slots(
    client: TestClient, ready_learner: dict[str, str], monkeypatch: Any
) -> None:
    session = client.post(
        "/v1/sessions",
        headers={**ready_learner, "Idempotency-Key": "turn-flow-one"},
        json={"mission_slug": "us-immigration", "mode": "coach", "hint_locale": "hi-IN"},
    ).json()

    monkeypatch.setattr(
        api_module,
        "provider_for",
        lambda settings: ScriptedTurnAdapter(
            [{"role": "assistant", "content": "Good evening. May I see your passport?"}]
        ),
    )
    opening = client.post(
        f"/v1/sessions/{session['session_id']}/turns/start", headers=ready_learner
    )
    assert opening.status_code == 200
    opening_body = opening.json()
    assert opening_body["agent_transcript"] == "Good evening. May I see your passport?"
    assert opening_body["agent_sequence"] == 1
    assert opening_body["status"] == "active"
    assert opening_body["agent_audio_base64"]

    monkeypatch.setattr(
        api_module,
        "provider_for",
        lambda settings: ScriptedTurnAdapter(
            [
                {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call-1",
                            "function": {"name": "record_slot", "arguments": '{"slot": "purpose"}'},
                        }
                    ],
                },
                {"role": "assistant", "content": "How long will you stay?"},
            ]
        ),
    )
    turn = client.post(
        f"/v1/sessions/{session['session_id']}/turns/audio",
        headers=ready_learner,
        data={"sequence": 2, "started_at_ms": 0, "ended_at_ms": 1000},
        files={"audio": ("turn.webm", io.BytesIO(b"fake-audio"), "audio/webm")},
    )
    assert turn.status_code == 200
    turn_body = turn.json()
    assert turn_body["learner_transcript"] == "I am here for a holiday."
    assert turn_body["agent_transcript"] == "How long will you stay?"
    assert turn_body["slot_events"] == ["purpose"]
    assert turn_body["mission_complete"] is False
    assert turn_body["agent_sequence"] == 3


def test_audio_turn_rejects_a_sequence_gap(
    client: TestClient, ready_learner: dict[str, str], monkeypatch: Any
) -> None:
    session = client.post(
        "/v1/sessions",
        headers={**ready_learner, "Idempotency-Key": "turn-flow-two"},
        json={"mission_slug": "hotel-check-in", "mode": "coach", "hint_locale": "hi-IN"},
    ).json()
    monkeypatch.setattr(
        api_module,
        "provider_for",
        lambda settings: ScriptedTurnAdapter([{"role": "assistant", "content": "Hello."}]),
    )
    client.post(f"/v1/sessions/{session['session_id']}/turns/start", headers=ready_learner)

    turn = client.post(
        f"/v1/sessions/{session['session_id']}/turns/audio",
        headers=ready_learner,
        data={"sequence": 9, "started_at_ms": 0, "ended_at_ms": 1000},
        files={"audio": ("turn.webm", io.BytesIO(b"fake-audio"), "audio/webm")},
    )
    assert turn.status_code == 409
    assert turn.json()["error"]["code"] == "event_sequence_gap"


def test_repeat_repair_returns_a_spoken_reply(
    client: TestClient, ready_learner: dict[str, str], monkeypatch: Any
) -> None:
    session = client.post(
        "/v1/sessions",
        headers={**ready_learner, "Idempotency-Key": "turn-flow-repair"},
        json={"mission_slug": "restaurant-ordering", "mode": "coach", "hint_locale": "hi-IN"},
    ).json()
    monkeypatch.setattr(
        api_module,
        "provider_for",
        lambda settings: ScriptedTurnAdapter(
            [{"role": "assistant", "content": "Are you ready to order?"}]
        ),
    )
    client.post(f"/v1/sessions/{session['session_id']}/turns/start", headers=ready_learner)

    monkeypatch.setattr(
        api_module,
        "provider_for",
        lambda settings: ScriptedTurnAdapter(
            [{"role": "assistant", "content": "Are you ready to order?"}]
        ),
    )
    repair = client.post(
        f"/v1/sessions/{session['session_id']}/repairs",
        headers=ready_learner,
        json={"kind": "repeat", "sequence": 1},
    )
    assert repair.status_code == 200
    body = repair.json()
    assert body["accepted"] is True
    assert body["agent_transcript"] == "Are you ready to order?"
    assert body["agent_audio_base64"]


def test_hint_repair_does_not_call_the_provider(
    client: TestClient, ready_learner: dict[str, str], monkeypatch: Any
) -> None:
    session = client.post(
        "/v1/sessions",
        headers={**ready_learner, "Idempotency-Key": "turn-flow-hint"},
        json={"mission_slug": "asking-directions", "mode": "coach", "hint_locale": "hi-IN"},
    ).json()
    monkeypatch.setattr(
        api_module,
        "provider_for",
        lambda settings: ScriptedTurnAdapter(
            [{"role": "assistant", "content": "Where are you trying to go?"}]
        ),
    )
    client.post(f"/v1/sessions/{session['session_id']}/turns/start", headers=ready_learner)

    def explode(settings: Any) -> Any:
        raise AssertionError("hint must not call the provider")

    monkeypatch.setattr(api_module, "provider_for", explode)
    repair = client.post(
        f"/v1/sessions/{session['session_id']}/repairs",
        headers=ready_learner,
        json={"kind": "hint", "sequence": 1},
    )
    assert repair.status_code == 200
    body = repair.json()
    assert body["agent_transcript"] is None
    assert body["agent_audio_base64"] is None


def test_audio_turn_before_mission_start_is_rejected(
    client: TestClient, ready_learner: dict[str, str]
) -> None:
    session = client.post(
        "/v1/sessions",
        headers={**ready_learner, "Idempotency-Key": "turn-flow-three"},
        json={"mission_slug": "missing-baggage", "mode": "coach", "hint_locale": "hi-IN"},
    ).json()
    turn = client.post(
        f"/v1/sessions/{session['session_id']}/turns/audio",
        headers=ready_learner,
        data={"sequence": 1, "started_at_ms": 0, "ended_at_ms": 1000},
        files={"audio": ("turn.webm", io.BytesIO(b"fake-audio"), "audio/webm")},
    )
    assert turn.status_code == 409
    assert turn.json()["error"]["code"] == "session_not_active"
