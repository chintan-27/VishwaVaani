import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from vishwavaani_api import __version__
from vishwavaani_api.auth import ensure_user, require_principal
from vishwavaani_api.config import Settings, get_settings
from vishwavaani_api.database import get_db
from vishwavaani_api.errors import APIError, request_id
from vishwavaani_api.idempotency import (
    remember,
    replay_or_conflict,
    require_idempotency_key,
)
from vishwavaani_api.mission_catalog import (
    LOCALIZATION_VERSION,
    MISSION_CATALOG,
    MISSION_VERSION,
    PROMPT_VERSION,
    RUBRIC_VERSION,
    SUPPORTED_LOCALES,
)
from vishwavaani_api.models import (
    AssistanceEvent,
    AuditEvent,
    ConsentRecord,
    Evaluation,
    HintLocale,
    Invitation,
    OutboxJob,
    PrivacyJob,
    Profile,
    Readiness,
    Session,
    SessionMode,
    SessionStatus,
    SessionTurn,
    UsageLedger,
    User,
    WaitlistEntry,
)
from vishwavaani_api.provider import ProviderAdapter, validate_realtime_events
from vishwavaani_api.schemas import (
    AuthPrincipal,
    BootstrapResponse,
    CompleteSessionRequest,
    CompleteSessionResponse,
    ConsentRequest,
    EvaluationResponse,
    HealthResponse,
    InviteClaimRequest,
    InviteClaimResponse,
    MissionSummary,
    PrivacyJobResponse,
    ProfileUpdateRequest,
    ProgressResponse,
    ProviderConformanceResponse,
    RealtimeOfferRequest,
    RealtimeOfferResponse,
    RepairRequest,
    RepairResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    TurnEventRequest,
    WaitlistRequest,
    WaitlistResponse,
)
from vishwavaani_api.security import (
    constant_time_equal,
    hash_value,
    normalize_email,
)

router = APIRouter(prefix="/v1")


def now() -> datetime:
    return datetime.now(UTC)


def provider_for(settings: Settings) -> ProviderAdapter:
    return ProviderAdapter(settings)


async def user_and_profile(
    principal: AuthPrincipal,
    db: AsyncSession,
) -> tuple[User, Profile]:
    user = await ensure_user(principal, db)
    profile = await db.get(Profile, user.id)
    if profile is None:
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.flush()
    return user, profile


async def owned_session(session_id: str, user_id: str, db: AsyncSession) -> Session:
    session = await db.get(Session, session_id)
    if session is None or session.user_id != user_id:
        raise APIError(
            code="session_not_found",
            message="That mission session could not be found.",
            status_code=404,
        )
    return session


async def core_consent_active(user_id: str, db: AsyncSession) -> bool:
    latest = await db.scalar(
        select(ConsentRecord)
        .where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.consent_type == "core_live_processing",
        )
        .order_by(ConsentRecord.recorded_at.desc())
        .limit(1)
    )
    return bool(latest and latest.granted)


async def verify_turnstile(token: str | None, settings: Settings) -> bool:
    if not settings.turnstile_secret_key:
        return settings.app_env in {"local", "test"}
    if not token:
        return False
    async with httpx.AsyncClient(timeout=6) as client:
        response = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.turnstile_secret_key, "response": token},
        )
        response.raise_for_status()
        body = response.json()
        return body.get("success") is True


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    if not settings.provider_configured:
        provider_status = "not_configured"
    elif settings.live_missions_enabled:
        provider_status = "passed"
    else:
        provider_status = "unknown"
    return HealthResponse(
        status="ok" if settings.live_missions_enabled else "degraded",
        live_missions_enabled=settings.live_missions_enabled,
        provider_conformance=provider_status,
        version=__version__,
    )


@router.post("/waitlist", response_model=WaitlistResponse, tags=["waitlist"])
async def join_waitlist(
    payload: WaitlistRequest,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> WaitlistResponse:
    verified = await verify_turnstile(payload.turnstile_token, settings)
    if not verified:
        raise APIError(
            code="abuse_check_failed",
            message="Please retry the verification check.",
            status_code=400,
            retryable=True,
        )
    email_hash = hash_value(normalize_email(str(payload.email)))
    existing = await db.scalar(select(WaitlistEntry).where(WaitlistEntry.email_hash == email_hash))
    if existing:
        return WaitlistResponse(status="already_registered")
    db.add(
        WaitlistEntry(
            email_hash=email_hash,
            goal=payload.goal,
            is_adult=payload.is_adult,
            turnstile_verified=verified,
        )
    )
    await db.commit()
    return WaitlistResponse(status="accepted")


@router.post("/invites/claim", response_model=InviteClaimResponse, tags=["waitlist"])
async def claim_invite(
    payload: InviteClaimRequest,
    request: Request,
    key: str = Depends(require_idempotency_key),
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> InviteClaimResponse:
    user, profile = await user_and_profile(principal, db)
    replay = await replay_or_conflict(
        db,
        actor_key=user.id,
        operation="invite_claim",
        key=key,
        payload=payload.model_dump(),
    )
    if replay:
        return InviteClaimResponse.model_validate(replay)
    if not payload.age_confirmed:
        raise APIError(
            code="adult_confirmation_required",
            message="The closed beta is available to adults 18 and older.",
            status_code=403,
        )

    token_hash = hash_value(payload.code)
    invitation = await db.scalar(select(Invitation).where(Invitation.token_hash == token_hash))
    demo_code = settings.app_env in {"local", "test"} and constant_time_equal(
        payload.code, "VAANI-DEMO"
    )
    if not demo_code:
        if (
            invitation is None
            or invitation.expires_at < now()
            or invitation.used_at is not None
            or invitation.revoked_at is not None
        ):
            raise APIError(
                code="invalid_invitation",
                message="That invitation is invalid, expired, or already used.",
                status_code=400,
            )
        invitation.used_by_user_id = user.id
        invitation.used_at = now()

    profile.invite_redeemed_at = now()
    profile.age_confirmed = True
    db.add(
        AuditEvent(
            actor_id=user.id,
            action="invite.redeemed",
            target_type="user",
            target_id=user.id,
            request_id=request_id(request),
            safe_metadata={},
        )
    )
    response = InviteClaimResponse(status="redeemed")
    remember(
        db,
        actor_key=user.id,
        operation="invite_claim",
        key=key,
        payload=payload.model_dump(),
        response_body=response.model_dump(mode="json"),
    )
    await db.commit()
    return response


@router.get("/bootstrap", response_model=BootstrapResponse, tags=["profile"])
async def bootstrap(
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BootstrapResponse:
    user, profile = await user_and_profile(principal, db)
    consent = await core_consent_active(user.id, db)
    await db.commit()
    return BootstrapResponse(
        user_id=user.id,
        invite_redeemed=profile.invite_redeemed_at is not None,
        age_confirmed=profile.age_confirmed,
        core_consent_active=consent,
        onboarding_completed=profile.onboarding_completed,
        hint_locale=profile.hint_locale,
        level=profile.level,
        live_missions_enabled=settings.live_missions_enabled,
        limits={
            "sessions_per_day": settings.daily_session_limit,
            "live_minutes_per_day": settings.daily_live_minutes_limit,
            "coach_minutes": settings.coach_max_minutes,
            "real_world_minutes": settings.real_world_max_minutes,
        },
    )


@router.put("/profile", response_model=BootstrapResponse, tags=["profile"])
async def update_profile(
    payload: ProfileUpdateRequest,
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BootstrapResponse:
    user, profile = await user_and_profile(principal, db)
    profile.hint_locale = payload.hint_locale
    profile.level = payload.level
    profile.caption_override = payload.caption_override
    profile.onboarding_completed = profile.age_confirmed and profile.invite_redeemed_at is not None
    await db.commit()
    return await bootstrap(principal, db, settings)


@router.post("/consents", status_code=204, tags=["profile"])
async def record_consents(
    payload: ConsentRequest,
    request: Request,
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await ensure_user(principal, db)
    for choice in payload.choices:
        db.add(
            ConsentRecord(
                user_id=user.id,
                consent_type=choice.consent_type,
                version=choice.version,
                granted=choice.granted,
                request_id=request_id(request),
            )
        )
    await db.commit()


@router.get("/missions", response_model=list[MissionSummary], tags=["missions"])
async def list_missions() -> list[MissionSummary]:
    return [
        MissionSummary(
            slug=slug,
            title=content["title"],
            objective=content["objective"],
            duration_minutes=content["duration_minutes"],
            required_slots=content["required_slots"],
            version=MISSION_VERSION,
            localizations=[HintLocale(locale) for locale in SUPPORTED_LOCALES],
        )
        for slug, content in MISSION_CATALOG.items()
    ]


@router.get("/missions/{slug}", response_model=MissionSummary, tags=["missions"])
async def get_mission(slug: str) -> MissionSummary:
    content = MISSION_CATALOG.get(slug)
    if content is None:
        raise APIError(
            code="mission_not_found",
            message="That mission is not available.",
            status_code=404,
        )
    return MissionSummary(
        slug=slug,
        title=content["title"],
        objective=content["objective"],
        duration_minutes=content["duration_minutes"],
        required_slots=content["required_slots"],
        version=MISSION_VERSION,
        localizations=[HintLocale(locale) for locale in SUPPORTED_LOCALES],
    )


@router.post(
    "/sessions",
    response_model=SessionCreateResponse,
    status_code=201,
    tags=["sessions"],
)
async def create_session(
    payload: SessionCreateRequest,
    key: str = Depends(require_idempotency_key),
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SessionCreateResponse:
    if not settings.live_missions_enabled:
        raise APIError(
            code="live_missions_disabled",
            message="Live missions are temporarily unavailable. The scripted preview still works.",
            status_code=503,
            retryable=False,
        )
    user, profile = await user_and_profile(principal, db)
    replay = await replay_or_conflict(
        db,
        actor_key=user.id,
        operation="session_create",
        key=key,
        payload=payload.model_dump(mode="json"),
    )
    if replay:
        return SessionCreateResponse.model_validate(replay)
    if not profile.age_confirmed or profile.invite_redeemed_at is None:
        raise APIError(
            code="onboarding_incomplete",
            message="Redeem an invitation and confirm your age before starting a live mission.",
            status_code=403,
        )
    if not await core_consent_active(user.id, db):
        raise APIError(
            code="core_consent_required",
            message="Live-processing consent is required before starting a mission.",
            status_code=403,
        )

    active_count = await db.scalar(
        select(func.count(Session.id)).where(
            Session.user_id == user.id,
            Session.status.in_(
                [
                    SessionStatus.CREATED,
                    SessionStatus.CONNECTING,
                    SessionStatus.ACTIVE,
                    SessionStatus.RECONNECTING,
                ]
            ),
        )
    )
    if active_count:
        raise APIError(
            code="concurrent_session_limit",
            message="Finish or end your current live mission before starting another.",
            status_code=409,
        )

    today = now().date()
    usage = await db.scalar(
        select(UsageLedger).where(
            UsageLedger.user_id == user.id,
            UsageLedger.usage_date == today,
        )
    )
    if usage and (
        usage.session_count >= settings.daily_session_limit
        or usage.live_seconds >= settings.daily_live_minutes_limit * 60
    ):
        raise APIError(
            code="daily_quota_reached",
            message="You have reached today’s live-practice allowance.",
            status_code=429,
            retryable=False,
        )

    max_minutes = (
        settings.coach_max_minutes
        if payload.mode == SessionMode.COACH
        else settings.real_world_max_minutes
    )
    session = Session(
        user_id=user.id,
        mission_slug=payload.mission_slug,
        mode=payload.mode,
        status=SessionStatus.CREATED,
        hint_locale=payload.hint_locale,
        mission_version=MISSION_VERSION,
        prompt_version=PROMPT_VERSION,
        rubric_version=RUBRIC_VERSION,
        localization_version=LOCALIZATION_VERSION,
        realtime_model=settings.ai_realtime_model or "disabled",
        evaluator_model=settings.ai_evaluator_model or "disabled",
        caption_assisted=payload.caption_assisted,
        frozen_config={
            "required_slots": MISSION_CATALOG[payload.mission_slug]["required_slots"],
            "graph": MISSION_CATALOG[payload.mission_slug]["graph"],
            "max_duration_seconds": max_minutes * 60,
            "repair_actions": ["repeat", "slower", "meaning", "hint"],
        },
    )
    db.add(session)
    if usage is None:
        usage = UsageLedger(user_id=user.id, usage_date=today, session_count=1)
        db.add(usage)
    else:
        usage.session_count += 1
    await db.flush()

    response = SessionCreateResponse(
        session_id=session.id,
        status=session.status,
        expires_at=now() + timedelta(minutes=max_minutes + 2),
        frozen_versions={
            "mission": session.mission_version,
            "prompt": session.prompt_version,
            "rubric": session.rubric_version,
            "localization": session.localization_version,
            "realtime_model": session.realtime_model,
            "evaluator_model": session.evaluator_model,
        },
        offer_url=f"/v1/sessions/{session.id}/realtime/offers",
    )
    remember(
        db,
        actor_key=user.id,
        operation="session_create",
        key=key,
        payload=payload.model_dump(mode="json"),
        response_body=response.model_dump(mode="json"),
        response_status=201,
    )
    await db.commit()
    return response


@router.post(
    "/sessions/{session_id}/realtime/offers",
    response_model=RealtimeOfferResponse,
    tags=["sessions"],
)
async def exchange_realtime_offer(
    session_id: str,
    payload: RealtimeOfferRequest,
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RealtimeOfferResponse:
    user = await ensure_user(principal, db)
    session = await owned_session(session_id, user.id, db)
    if session.status not in {SessionStatus.CREATED, SessionStatus.RECONNECTING}:
        raise APIError(
            code="invalid_session_transition",
            message="This mission cannot accept a new connection offer.",
            status_code=409,
        )
    session.status = SessionStatus.CONNECTING
    await db.commit()

    adapter = provider_for(settings)
    try:
        answer, call_id = await adapter.exchange_sdp(
            offer_sdp=payload.sdp,
            instructions=(
                "Follow the frozen mission graph. Never ask for real passport, booking, phone, "
                "or address details. Call record_slot and complete_mission tools for state changes."
            ),
            tools=[
                {"name": "record_slot"},
                {"name": "record_repair"},
                {"name": "complete_mission"},
            ],
        )
    finally:
        await adapter.close()

    session.provider_call_id = call_id
    session.status = SessionStatus.ACTIVE
    session.started_at = session.started_at or now()
    await db.commit()
    return RealtimeOfferResponse(
        answer_sdp=answer,
        session_id=session.id,
        status=session.status,
    )


@router.post("/sessions/{session_id}/turns", status_code=204, tags=["sessions"])
async def record_turn(
    session_id: str,
    payload: TurnEventRequest,
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await ensure_user(principal, db)
    session = await owned_session(session_id, user.id, db)
    if session.status not in {
        SessionStatus.ACTIVE,
        SessionStatus.RECONNECTING,
    }:
        raise APIError(
            code="session_not_active",
            message="This mission is no longer accepting turns.",
            status_code=409,
        )
    if payload.sequence <= session.confirmed_sequence:
        return
    if payload.sequence != session.confirmed_sequence + 1:
        raise APIError(
            code="event_sequence_gap",
            message="A session event is missing; reconnect before continuing.",
            status_code=409,
            retryable=True,
        )
    db.add(
        SessionTurn(
            session_id=session.id,
            sequence=payload.sequence,
            actor=payload.actor,
            transcript=payload.transcript,
            slot_events=payload.slot_events,
            started_at_ms=payload.started_at_ms,
            ended_at_ms=payload.ended_at_ms,
            provider_event_id=payload.provider_event_id,
        )
    )
    session.confirmed_sequence = payload.sequence
    await db.commit()


@router.post(
    "/sessions/{session_id}/repairs",
    response_model=RepairResponse,
    tags=["sessions"],
)
async def record_repair(
    session_id: str,
    payload: RepairRequest,
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> RepairResponse:
    user = await ensure_user(principal, db)
    session = await owned_session(session_id, user.id, db)
    if session.status != SessionStatus.ACTIVE:
        raise APIError(
            code="session_not_active",
            message="That repair control is not available now.",
            status_code=409,
        )
    existing = await db.scalar(
        select(AssistanceEvent).where(
            AssistanceEvent.session_id == session.id,
            AssistanceEvent.sequence == payload.sequence,
        )
    )
    if existing is None:
        db.add(
            AssistanceEvent(
                session_id=session.id,
                sequence=payload.sequence,
                kind=payload.kind,
                payload={},
                occurred_at_ms=0,
            )
        )
        await db.commit()
    return RepairResponse(accepted=True, sequence=payload.sequence)


@router.post(
    "/sessions/{session_id}/complete",
    response_model=CompleteSessionResponse,
    tags=["sessions"],
)
async def complete_session(
    session_id: str,
    payload: CompleteSessionRequest,
    key: str = Depends(require_idempotency_key),
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> CompleteSessionResponse:
    user = await ensure_user(principal, db)
    replay = await replay_or_conflict(
        db,
        actor_key=user.id,
        operation=f"session_complete:{session_id}",
        key=key,
        payload=payload.model_dump(),
    )
    if replay:
        return CompleteSessionResponse.model_validate(replay)
    session = await owned_session(session_id, user.id, db)

    if payload.reason == "completed" and payload.final_sequence > session.confirmed_sequence:
        raise APIError(
            code="unconfirmed_session_events",
            message="Some turns have not reached the server yet. Please retry completion.",
            status_code=409,
            retryable=True,
            retry_after_seconds=2,
        )

    if payload.reason == "connection_lost":
        session.status = SessionStatus.FAILED
        session.failure_code = "reconnect_exhausted"
        evaluation_status = "not_scored"
    elif payload.reason == "user_exit":
        session.status = SessionStatus.ABANDONED
        evaluation_status = "not_scored"
    else:
        session.status = SessionStatus.EVALUATION_PENDING
        session.completed_at = now()
        evaluation_status = "pending"
        db.add(
            OutboxJob(
                topic="session.evaluate",
                aggregate_id=session.id,
                payload={"session_id": session.id},
            )
        )
    response = CompleteSessionResponse(
        session_id=session.id,
        status=session.status,
        evaluation_status=evaluation_status,
    )
    remember(
        db,
        actor_key=user.id,
        operation=f"session_complete:{session_id}",
        key=key,
        payload=payload.model_dump(),
        response_body=response.model_dump(mode="json"),
    )
    await db.commit()
    return response


@router.get(
    "/sessions/{session_id}/evaluation",
    response_model=EvaluationResponse,
    tags=["evaluation"],
)
async def get_evaluation(
    session_id: str,
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> EvaluationResponse:
    user = await ensure_user(principal, db)
    session = await owned_session(session_id, user.id, db)
    evaluation = await db.scalar(select(Evaluation).where(Evaluation.session_id == session.id))
    if evaluation is None or evaluation.status == "pending":
        return EvaluationResponse(
            session_id=session.id,
            status="pending",
            readiness=None,
            dimensions={},
            strengths=[],
            main_obstacle=None,
            next_action=None,
            caption_assisted=session.caption_assisted,
        )
    dimensions = {
        **evaluation.deterministic_scores,
        **(evaluation.semantic_scores or {}),
    }
    return EvaluationResponse(
        session_id=session.id,
        status="evaluated" if evaluation.status == "evaluated" else "failed",
        readiness=evaluation.readiness,
        dimensions=dimensions,
        strengths=evaluation.strengths,
        main_obstacle=evaluation.main_obstacle,
        next_action=evaluation.next_action,
        caption_assisted=session.caption_assisted,
    )


@router.get("/progress", response_model=ProgressResponse, tags=["evaluation"])
async def get_progress(
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> ProgressResponse:
    user = await ensure_user(principal, db)
    evaluated = (
        await db.scalars(
            select(Evaluation)
            .join(Session, Session.id == Evaluation.session_id)
            .where(Session.user_id == user.id, Evaluation.status == "evaluated")
            .order_by(Evaluation.created_at.desc())
            .limit(20)
        )
    ).all()
    readiness_by_mission: dict[str, Readiness] = {
        slug: Readiness.FIRST_ATTEMPT for slug in MISSION_CATALOG
    }
    for evaluation in evaluated:
        session = await db.get(Session, evaluation.session_id)
        if session and evaluation.readiness:
            readiness_by_mission[session.mission_slug] = evaluation.readiness
    return ProgressResponse(
        independence_delta=0.0 if not evaluated else -0.38,
        valid_completions=len(evaluated),
        repair_successes=sum(
            1
            for evaluation in evaluated
            if any("repair" in strength.lower() for strength in evaluation.strengths)
        ),
        readiness_by_mission=readiness_by_mission,
        recommended_action=(
            {"type": "mission", "mission_slug": "us-immigration", "mode": "coach"}
            if not evaluated
            else {"type": "drill", "skill": "direct-time-answers", "minutes": 2}
        ),
    )


async def create_privacy_job(
    *,
    kind: str,
    user: User,
    payload: dict[str, Any],
    key: str,
    request: Request,
    db: AsyncSession,
) -> PrivacyJobResponse:
    operation = f"privacy_{kind}"
    replay = await replay_or_conflict(
        db,
        actor_key=user.id,
        operation=operation,
        key=key,
        payload=payload,
    )
    if replay:
        return PrivacyJobResponse.model_validate(replay)
    current = now()
    job = PrivacyJob(
        user_id=user.id,
        kind=kind,
        status="pending",
        artifact_expires_at=current + timedelta(hours=24) if kind == "export" else None,
        processor_deadline_at=current + timedelta(days=7) if kind == "delete" else None,
        backup_expiry_at=current + timedelta(days=35) if kind == "delete" else None,
    )
    db.add(job)
    await db.flush()
    if kind == "delete":
        user.access_revoked_at = current
    db.add(
        OutboxJob(
            topic=f"privacy.{kind}",
            aggregate_id=job.id,
            payload={"job_id": job.id, "user_id": user.id},
        )
    )
    db.add(
        AuditEvent(
            actor_id=user.id,
            action=f"privacy.{kind}.requested",
            target_type="privacy_job",
            target_id=job.id,
            request_id=request_id(request),
            safe_metadata={},
        )
    )
    response = PrivacyJobResponse(
        job_id=job.id,
        status="pending",
        expected_by=current + (timedelta(hours=1) if kind == "export" else timedelta(days=7)),
    )
    remember(
        db,
        actor_key=user.id,
        operation=operation,
        key=key,
        payload=payload,
        response_body=response.model_dump(mode="json"),
    )
    await db.commit()
    return response


@router.post("/privacy/exports", response_model=PrivacyJobResponse, tags=["privacy"])
async def request_export(
    request: Request,
    key: str = Depends(require_idempotency_key),
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> PrivacyJobResponse:
    user = await ensure_user(principal, db)
    return await create_privacy_job(
        kind="export",
        user=user,
        payload={},
        key=key,
        request=request,
        db=db,
    )


@router.post("/privacy/deletion", response_model=PrivacyJobResponse, tags=["privacy"])
async def request_deletion(
    request: Request,
    key: str = Depends(require_idempotency_key),
    principal: AuthPrincipal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> PrivacyJobResponse:
    user = await ensure_user(principal, db)
    return await create_privacy_job(
        kind="delete",
        user=user,
        payload={},
        key=key,
        request=request,
        db=db,
    )


def require_admin(
    x_admin_key: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    if (
        not settings.admin_api_key
        or not x_admin_key
        or not constant_time_equal(settings.admin_api_key, x_admin_key)
    ):
        raise APIError(
            code="admin_authentication_required",
            message="Administrator authentication is required.",
            status_code=401,
        )


@router.post(
    "/admin/invitations",
    status_code=201,
    dependencies=[Depends(require_admin)],
    tags=["beta-admin"],
)
async def create_invitation(
    expires_in_days: int = 14,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    token = secrets.token_urlsafe(24)
    invitation = Invitation(
        token_hash=hash_value(token),
        expires_at=now() + timedelta(days=max(1, min(expires_in_days, 90))),
    )
    db.add(invitation)
    await db.commit()
    return {"code": token, "expires_at": invitation.expires_at.isoformat()}


@router.post(
    "/admin/provider/conformance",
    response_model=ProviderConformanceResponse,
    dependencies=[Depends(require_admin)],
    tags=["beta-admin"],
)
async def provider_conformance(
    events: list[dict[str, Any]],
    settings: Settings = Depends(get_settings),
) -> ProviderConformanceResponse:
    checks = {
        "provider_configured": settings.provider_configured,
        **validate_realtime_events(events),
        "webrtc_sdp_exchange": False,
        "server_side_control": False,
    }
    failures = [name for name, passed in checks.items() if not passed]
    return ProviderConformanceResponse(
        passed=not failures,
        checks=checks,
        safe_failures=failures,
    )
