from fastapi.testclient import TestClient


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
