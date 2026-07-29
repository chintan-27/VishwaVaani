from collections.abc import Iterable
from typing import Any

from vishwavaani_api.models import Readiness


def score_dimension(
    value: float | None,
    *,
    evidence: list[str],
    confidence: float,
    source: str = "deterministic",
) -> dict[str, Any]:
    return {
        "value": round(value, 3) if value is not None else None,
        "evidence": evidence,
        "confidence": round(confidence, 3),
        "source": source,
    }


def deterministic_scores(
    *,
    required_slots: list[str],
    observed_slots: Iterable[str],
    assistance_kinds: Iterable[str],
    duration_seconds: int,
    max_duration_seconds: int,
    valid_completion: bool,
) -> dict[str, dict[str, Any]]:
    observed = set(observed_slots)
    assistance = list(assistance_kinds)
    covered = [slot for slot in required_slots if slot in observed]
    slot_value = len(covered) / len(required_slots) if required_slots else 0
    assistance_weight = {
        "repeat": 0.05,
        "slower": 0.05,
        "meaning": 0.1,
        "hint": 0.18,
    }
    assistance_cost = min(1.0, sum(assistance_weight.get(kind, 0.03) for kind in assistance))
    independence_value = max(0.0, 1.0 - assistance_cost)
    timing_value = min(1.0, max_duration_seconds / max(duration_seconds, 1))

    return {
        "task_completion": score_dimension(
            1.0 if valid_completion and slot_value == 1 else slot_value,
            evidence=[f"{len(covered)} of {len(required_slots)} required details confirmed"],
            confidence=1.0,
        ),
        "slot_coverage": score_dimension(
            slot_value,
            evidence=covered,
            confidence=1.0,
        ),
        "independence": score_dimension(
            independence_value,
            evidence=[f"{len(assistance)} assistance actions used"],
            confidence=1.0,
        ),
        "timing": score_dimension(
            timing_value,
            evidence=[f"Completed in {duration_seconds} seconds"],
            confidence=1.0,
        ),
    }


def readiness_from_scores(
    dimensions: dict[str, dict[str, Any]],
    *,
    previous_valid_attempts: int,
) -> Readiness:
    task = dimensions["task_completion"]["value"] or 0
    independence = dimensions["independence"]["value"] or 0
    if task >= 1 and independence >= 0.82 and previous_valid_attempts >= 1:
        return Readiness.READY
    if task >= 1 and independence >= 0.62:
        return Readiness.NEARLY_READY
    if previous_valid_attempts == 0:
        return Readiness.FIRST_ATTEMPT
    return Readiness.PRACTICING


def clarity_score(*, value: float, confidence: float, evidence: list[str]) -> dict[str, Any]:
    """Abstain when clarity evidence is not calibrated enough for a fair decision."""
    return score_dimension(
        value if confidence >= 0.7 else None,
        evidence=evidence,
        confidence=confidence,
        source="evaluator",
    )
