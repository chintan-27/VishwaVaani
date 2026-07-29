import asyncio
from datetime import UTC, datetime

from celery import Celery
from sqlalchemy import select

from vishwavaani_api.config import get_settings
from vishwavaani_api.database import SessionFactory
from vishwavaani_api.errors import APIError
from vishwavaani_api.models import (
    AssistanceEvent,
    Evaluation,
    OutboxJob,
    Session,
    SessionStatus,
    SessionTurn,
)
from vishwavaani_api.provider import ProviderAdapter
from vishwavaani_api.scoring import deterministic_scores, readiness_from_scores

settings = get_settings()
app = Celery("vishwavaani", broker=settings.redis_url, backend=settings.redis_url)
app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

RETRY_DELAYS = [5, 30, 120]


async def evaluate_session_async(session_id: str) -> None:
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
        duration_seconds = max(
            1,
            int(
                (
                    (session.completed_at or datetime.now(UTC))
                    - (session.started_at or session.created_at)
                ).total_seconds()
            ),
        )
        scores = deterministic_scores(
            required_slots=session.frozen_config["required_slots"],
            observed_slots=observed_slots,
            assistance_kinds=[event.kind for event in assistance],
            duration_seconds=duration_seconds,
            max_duration_seconds=session.frozen_config["max_duration_seconds"],
            valid_completion=True,
        )
        evaluation.deterministic_scores = scores
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
        evaluation.readiness = readiness_from_scores(scores, previous_valid_attempts=0)
        evaluation.status = "evaluated"
        evaluation.attempt_count += 1
        session.status = SessionStatus.EVALUATED
        await db.commit()


@app.task(bind=True, name="session.evaluate", max_retries=3)
def evaluate_session(self, session_id: str) -> None:
    try:
        asyncio.run(evaluate_session_async(session_id))
    except APIError as exc:
        if not exc.retryable or self.request.retries >= len(RETRY_DELAYS):
            return
        raise self.retry(exc=exc, countdown=RETRY_DELAYS[self.request.retries]) from exc


@app.task(name="outbox.dispatch")
def dispatch_outbox() -> None:
    asyncio.run(dispatch_outbox_async())


async def dispatch_outbox_async() -> None:
    async with SessionFactory() as db:
        jobs = (
            await db.scalars(
                select(OutboxJob)
                .where(OutboxJob.status == "pending")
                .order_by(OutboxJob.available_at)
                .limit(50)
                .with_for_update(skip_locked=True)
            )
        ).all()
        for job in jobs:
            if job.topic == "session.evaluate":
                evaluate_session.delay(job.payload["session_id"])
                job.status = "completed"
                job.completed_at = datetime.now(UTC)
            elif job.topic.startswith("privacy."):
                job.status = "pending"
            job.attempts += 1
        await db.commit()
