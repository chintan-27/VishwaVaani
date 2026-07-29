import pytest
from vishwavaani_api.mission_catalog import MISSION_CATALOG, validate_graph
from vishwavaani_api.models import Readiness
from vishwavaani_api.realtime_controller import ScenarioState
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


def test_low_confidence_clarity_abstains() -> None:
    result = clarity_score(
        value=0.2,
        confidence=0.55,
        evidence=["ASR signal was not calibrated for this speaker"],
    )
    assert result["value"] is None
    assert result["confidence"] == 0.55
