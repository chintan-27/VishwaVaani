import pytest
from sqlalchemy import select
from vishwavaani_api import evaluation as evaluation_module
from vishwavaani_api.database import SessionFactory
from vishwavaani_api.evaluation import evaluate_session_async
from vishwavaani_api.mission_catalog import MISSION_CATALOG, validate_graph
from vishwavaani_api.models import (
    Evaluation,
    Readiness,
    Session,
    SessionStatus,
    SessionTurn,
    User,
)
from vishwavaani_api.scenario import ScenarioState
from vishwavaani_api.schemas import ScoreDimension, SemanticEvaluation
from vishwavaani_api.scoring import (
    clarity_score,
    deterministic_scores,
    readiness_from_scores,
)


@pytest.mark.parametrize("slug", MISSION_CATALOG)
def test_mission_graphs_have_defined_completion_paths(slug: str) -> None:
    assert validate_graph(slug, MISSION_CATALOG[slug]["graph"]) == []


@pytest.mark.parametrize("slug", MISSION_CATALOG)
def test_required_slots_are_unique_and_complete(slug: str) -> None:
    slots = MISSION_CATALOG[slug]["required_slots"]
    assert len(slots) == 4
    assert len(slots) == len(set(slots))


def test_scenario_controller_rejects_model_invented_branch() -> None:
    state = ScenarioState("us-immigration")
    with pytest.raises(ValueError, match="Invalid scenario transition"):
        state.transition("model-invented-detour")


def test_scenario_controller_credits_repair_language() -> None:
    state = ScenarioState("hotel-check-in")
    state.record_assistance("repeat")
    assert state.assistance == ["repeat"]


def test_deterministic_score_uses_slots_assistance_and_timing() -> None:
    dimensions = deterministic_scores(
        required_slots=["purpose", "duration", "stay", "return"],
        observed_slots=["purpose", "duration", "stay", "return"],
        assistance_kinds=["repeat"],
        duration_seconds=240,
        max_duration_seconds=480,
        valid_completion=True,
    )
    assert dimensions["task_completion"]["value"] == 1
    assert dimensions["independence"]["value"] == 0.95
    assert readiness_from_scores(dimensions, previous_valid_attempts=1) == Readiness.READY


class StubAdapter:
    """Stands in for the provider so readiness can be asserted without a network call."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        pass

    async def evaluate(self, **kwargs: object) -> SemanticEvaluation:
        dimension = ScoreDimension(
            value=0.9, evidence=["clear"], confidence=0.9, source="evaluator"
        )
        return SemanticEvaluation(
            comprehension=dimension,
            grammar=dimension,
            clarity=dimension,
            strengths=["Recovered with a repair phrase"],
            main_obstacle="Slow to confirm the return date.",
            next_action={"type": "mission", "mission_slug": "us-immigration", "mode": "coach"},
        )

    async def close(self) -> None:
        return None


async def seed_flawless_session(user_id: str, *, status: SessionStatus) -> str:
    """Create a session that covers every required slot with no assistance used."""
    slots = MISSION_CATALOG["us-immigration"]["required_slots"]
    async with SessionFactory() as db:
        session = Session(
            user_id=user_id,
            mission_slug="us-immigration",
            mode="coach",
            status=status,
            hint_locale="hi-IN",
            mission_version="test",
            prompt_version="test",
            rubric_version="test",
            localization_version="test",
            realtime_model="realtime-test",
            evaluator_model="evaluator-test",
            frozen_config={
                "required_slots": slots,
                "graph": MISSION_CATALOG["us-immigration"]["graph"],
                "max_duration_seconds": 480,
                "repair_actions": [],
            },
        )
        db.add(session)
        await db.flush()
        for sequence, slot in enumerate(slots, start=1):
            db.add(
                SessionTurn(
                    session_id=session.id,
                    sequence=sequence,
                    actor="agent",
                    transcript="",
                    slot_events=[{"slot": slot}],
                    started_at_ms=0,
                    ended_at_ms=0,
                )
            )
        if status is SessionStatus.EVALUATED:
            db.add(
                Evaluation(
                    session_id=session.id,
                    evaluator_version="test",
                    status="evaluated",
                    readiness=Readiness.NEARLY_READY,
                )
            )
        await db.commit()
        return session.id


async def readiness_for_flawless_attempt(
    monkeypatch: pytest.MonkeyPatch, *, with_prior_attempt: bool
) -> Readiness | None:
    monkeypatch.setattr(evaluation_module, "ProviderAdapter", StubAdapter)
    async with SessionFactory() as db:
        user = User(external_auth_id=f"test:{with_prior_attempt}")
        db.add(user)
        await db.commit()
        user_id = user.id

    if with_prior_attempt:
        await seed_flawless_session(user_id, status=SessionStatus.EVALUATED)
    session_id = await seed_flawless_session(user_id, status=SessionStatus.EVALUATION_PENDING)

    await evaluate_session_async(session_id)

    async with SessionFactory() as db:
        evaluation = await db.scalar(
            select(Evaluation).where(Evaluation.session_id == session_id)
        )
        assert evaluation is not None
        return evaluation.readiness


async def test_second_flawless_attempt_can_reach_ready(monkeypatch: pytest.MonkeyPatch) -> None:
    """Regression: previous_valid_attempts was hardcoded to 0, so READY was unreachable."""
    readiness = await readiness_for_flawless_attempt(monkeypatch, with_prior_attempt=True)
    assert readiness is Readiness.READY


async def test_first_flawless_attempt_stops_at_nearly_ready(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    readiness = await readiness_for_flawless_attempt(monkeypatch, with_prior_attempt=False)
    assert readiness is Readiness.NEARLY_READY


def test_low_confidence_clarity_abstains() -> None:
    result = clarity_score(
        value=0.2,
        confidence=0.55,
        evidence=["ASR signal was not calibrated for this speaker"],
    )
    assert result["value"] is None
    assert result["confidence"] == 0.55
