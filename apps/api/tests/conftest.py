import os
from collections.abc import Iterator

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:////private/tmp/vishwavaani-test.db"
os.environ["AUTH_REQUIRED"] = "false"
os.environ["GLOBAL_LIVE_MISSIONS_ENABLED"] = "true"
os.environ["AI_BASE_URL"] = "https://provider.example"
os.environ["AI_API_KEY"] = "test-key"
os.environ["AI_REALTIME_MODEL"] = "realtime-test"
os.environ["AI_EVALUATOR_MODEL"] = "evaluator-test"
os.environ["ADMIN_API_KEY"] = "admin-test-key"

import pytest
from fastapi.testclient import TestClient
from vishwavaani_api.database import engine
from vishwavaani_api.main import app
from vishwavaani_api.models import Base


@pytest.fixture(autouse=True)
async def clean_database() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-Demo-User": "learner-one"}


@pytest.fixture
def ready_learner(client: TestClient, auth_headers: dict[str, str]) -> dict[str, str]:
    claim_headers = {**auth_headers, "Idempotency-Key": "claim-learner-one"}
    claim = client.post(
        "/v1/invites/claim",
        headers=claim_headers,
        json={"code": "VAANI-DEMO", "age_confirmed": True},
    )
    assert claim.status_code == 200
    consent = client.post(
        "/v1/consents",
        headers=auth_headers,
        json={
            "choices": [
                {
                    "consent_type": "core_live_processing",
                    "version": "1.0",
                    "granted": True,
                },
                {
                    "consent_type": "research",
                    "version": "1.0",
                    "granted": False,
                },
            ]
        },
    )
    assert consent.status_code == 204
    profile = client.put(
        "/v1/profile",
        headers=auth_headers,
        json={"hint_locale": "hi-IN", "level": "new", "caption_override": False},
    )
    assert profile.status_code == 200
    return auth_headers
