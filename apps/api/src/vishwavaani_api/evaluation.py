from datetime import UTC, datetime

from sqlalchemy import func, select

from vishwavaani_api.config import get_settings
from vishwavaani_api.database import SessionFactory
from vishwavaani_api.errors import APIError
from vishwavaani_api.models import (
    AssistanceEvent,
    Evaluation,
    Session,
    SessionStatus,
    SessionTurn,
)
from vishwavaani_api.provider import ProviderAdapter
from vishwavaani_api.scoring import deterministic_scores, readiness_from_scores


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


async def evaluate_session_async(session_id: str) -> None:
    """Evaluate a completed session inside the API process.

    This deliberately avoids a separate queue. If the provider is unavailable, the evaluation
    stays pending instead of inventing a result; it can be retried by completing the session again.
    """

    settings = get_settings()
    async with SessionFactory() as db:
        session = await db.get(Session, session_id)
        if session is None or session.status not in {
            SessionStatus.EVALUATION_PENDING,
            SessionStatus.COMPLETED,
        }:
            return
        evaluation = await db.scalar(select(Evaluation).where(Evaluation.session_id == session_id))
        if evaluation and evaluation.status == "evaluated":
            return
        if evaluation is None:
            evaluation = Evaluation(
                session_id=session_id,
                evaluator_version=session.rubric_version,
                status="pending",
            )
            db.add(evaluation)
            await db.flush()

        turns = (
            await db.scalars(
                select(SessionTurn)
                .where(SessionTurn.session_id == session_id)
                .order_by(SessionTurn.sequence)
            )
        ).all()
        assistance = (
            await db.scalars(
                select(AssistanceEvent)
                .where(AssistanceEvent.session_id == session_id)
                .order_by(AssistanceEvent.sequence)
            )
        ).all()
        observed_slots = [
            event["slot"]
            for turn in turns
            for event in turn.slot_events
            if isinstance(event, dict) and isinstance(event.get("slot"), str)
        ]
        started_at = as_utc(session.started_at or session.created_at)
        completed_at = as_utc(session.completed_at or datetime.now(UTC))
        duration_seconds = max(1, int((completed_at - started_at).total_seconds()))
        scores = deterministic_scores(
            required_slots=session.frozen_config["required_slots"],
            observed_slots=observed_slots,
            assistance_kinds=[event.kind for event in assistance],
            duration_seconds=duration_seconds,
            max_duration_seconds=session.frozen_config["max_duration_seconds"],
            valid_completion=True,
        )
        evaluation.deterministic_scores = scores
        evaluation.attempt_count += 1
        await db.commit()

        adapter = ProviderAdapter(settings)
        try:
            semantic = await adapter.evaluate(
                transcript=[
                    {
                        "actor": turn.actor,
                        "text": turn.transcript,
                        "slot_events": turn.slot_events,
                    }
                    for turn in turns
                ],
                deterministic_evidence=scores,
                frozen_rubric_version=session.rubric_version,
            )
        except APIError:
            return
        finally:
            await adapter.close()

        evaluation.semantic_scores = {
            "comprehension": semantic.comprehension.model_dump(),
            "grammar": semantic.grammar.model_dump(),
            "clarity": semantic.clarity.model_dump(),
        }
        evaluation.strengths = semantic.strengths
        evaluation.main_obstacle = semantic.main_obstacle
        evaluation.next_action = semantic.next_action
        previous_valid_attempts = (
            await db.scalar(
                select(func.count(Evaluation.id))
                .join(Session, Session.id == Evaluation.session_id)
                .where(
                    Session.user_id == session.user_id,
                    Session.mission_slug == session.mission_slug,
                    Session.id != session.id,
                    Evaluation.status == "evaluated",
                )
            )
            or 0
        )
        evaluation.readiness = readiness_from_scores(
            scores, previous_valid_attempts=previous_valid_attempts
        )
        evaluation.status = "evaluated"
        session.status = SessionStatus.EVALUATED
        await db.commit()
