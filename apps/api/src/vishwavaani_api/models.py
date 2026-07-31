import enum
import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


def uuid4_str() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class HintLocale(enum.StrEnum):
    HI_IN = "hi-IN"
    TA_IN = "ta-IN"
    TE_IN = "te-IN"
    BN_IN = "bn-IN"
    MR_IN = "mr-IN"


class SessionMode(enum.StrEnum):
    COACH = "coach"
    REAL_WORLD = "real_world"


class SessionStatus(enum.StrEnum):
    CREATED = "created"
    CONNECTING = "connecting"
    ACTIVE = "active"
    RECONNECTING = "reconnecting"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    FAILED = "failed"
    EVALUATION_PENDING = "evaluation-pending"
    EVALUATED = "evaluated"


class Readiness(enum.StrEnum):
    FIRST_ATTEMPT = "first-attempt"
    PRACTICING = "practicing"
    NEARLY_READY = "nearly-ready"
    READY = "ready"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    external_auth_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    access_revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthCode(Base):
    __tablename__ = "auth_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    email_hash: Mapped[str] = mapped_column(String(64), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    age_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    hint_locale: Mapped[HintLocale] = mapped_column(
        Enum(HintLocale, native_enum=False), default=HintLocale.HI_IN
    )
    level: Mapped[str] = mapped_column(String(24), default="new")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    invite_redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    caption_override: Mapped[bool] = mapped_column(Boolean, default=False)


class WaitlistEntry(Base, TimestampMixin):
    __tablename__ = "waitlist_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    email_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    goal: Mapped[str] = mapped_column(String(32))
    is_adult: Mapped[bool] = mapped_column(Boolean)
    source: Mapped[str] = mapped_column(String(64), default="web")
    invitation_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Invitation(Base, TimestampMixin):
    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    consent_type: Mapped[str] = mapped_column(String(48))
    version: Mapped[str] = mapped_column(String(32))
    granted: Mapped[bool] = mapped_column(Boolean)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    request_id: Mapped[str] = mapped_column(String(36))

    __table_args__ = (Index("ix_consent_user_type_time", "user_id", "consent_type", "recorded_at"),)


class MissionVersion(Base):
    __tablename__ = "mission_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    slug: Mapped[str] = mapped_column(String(64), index=True)
    version: Mapped[str] = mapped_column(String(32))
    prompt_version: Mapped[str] = mapped_column(String(32))
    rubric_version: Mapped[str] = mapped_column(String(32))
    graph: Mapped[dict[str, Any]] = mapped_column(JSON)
    required_slots: Mapped[list[str]] = mapped_column(JSON)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("slug", "version", name="uq_mission_slug_version"),)


class MissionLocalization(Base):
    __tablename__ = "mission_localizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    mission_version_id: Mapped[str] = mapped_column(ForeignKey("mission_versions.id"), index=True)
    locale: Mapped[HintLocale] = mapped_column(Enum(HintLocale, native_enum=False))
    version: Mapped[str] = mapped_column(String(32))
    content: Mapped[dict[str, Any]] = mapped_column(JSON)
    approved_by: Mapped[str] = mapped_column(String(128))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        UniqueConstraint(
            "mission_version_id", "locale", "version", name="uq_mission_localization_version"
        ),
    )


class Session(Base, TimestampMixin):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    mission_slug: Mapped[str] = mapped_column(String(64), index=True)
    mode: Mapped[SessionMode] = mapped_column(Enum(SessionMode, native_enum=False))
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, native_enum=False), default=SessionStatus.CREATED, index=True
    )
    hint_locale: Mapped[HintLocale] = mapped_column(Enum(HintLocale, native_enum=False))
    mission_version: Mapped[str] = mapped_column(String(32))
    prompt_version: Mapped[str] = mapped_column(String(32))
    rubric_version: Mapped[str] = mapped_column(String(32))
    localization_version: Mapped[str] = mapped_column(String(32))
    realtime_model: Mapped[str] = mapped_column(String(128))
    evaluator_model: Mapped[str] = mapped_column(String(128))
    frozen_config: Mapped[dict[str, Any]] = mapped_column(JSON)
    provider_call_id: Mapped[str | None] = mapped_column(String(128))
    confirmed_sequence: Mapped[int] = mapped_column(Integer, default=0)
    reconnect_attempts: Mapped[int] = mapped_column(Integer, default=0)
    caption_assisted: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failure_code: Mapped[str | None] = mapped_column(String(64))


class SessionTurn(Base):
    __tablename__ = "session_turns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    actor: Mapped[str] = mapped_column(String(16))
    transcript: Mapped[str] = mapped_column(Text)
    slot_events: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    started_at_ms: Mapped[int] = mapped_column(Integer)
    ended_at_ms: Mapped[int] = mapped_column(Integer)
    provider_event_id: Mapped[str | None] = mapped_column(String(128))
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (UniqueConstraint("session_id", "sequence", name="uq_turn_session_sequence"),)


class AssistanceEvent(Base):
    __tablename__ = "assistance_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(32))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    occurred_at_ms: Mapped[int] = mapped_column(Integer)

    __table_args__ = (
        UniqueConstraint("session_id", "sequence", name="uq_assistance_session_sequence"),
    )


class Evaluation(Base, TimestampMixin):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), unique=True, index=True)
    evaluator_version: Mapped[str] = mapped_column(String(32))
    readiness: Mapped[Readiness | None] = mapped_column(Enum(Readiness, native_enum=False))
    deterministic_scores: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    semantic_scores: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    strengths: Mapped[list[str]] = mapped_column(JSON, default=list)
    main_obstacle: Mapped[str | None] = mapped_column(Text)
    next_action: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error_code: Mapped[str | None] = mapped_column(String(64))


class LearnerSkillState(Base, TimestampMixin):
    __tablename__ = "learner_skill_states"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    skill_key: Mapped[str] = mapped_column(String(64))
    value: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (UniqueConstraint("user_id", "skill_key", name="uq_user_skill"),)


class Recommendation(Base, TimestampMixin):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    mission_slug: Mapped[str] = mapped_column(String(64))
    action: Mapped[dict[str, Any]] = mapped_column(JSON)
    reason: Mapped[str] = mapped_column(Text)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    actor_key: Mapped[str] = mapped_column(String(128))
    operation: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_fingerprint: Mapped[str] = mapped_column(String(64))
    response_status: Mapped[int] = mapped_column(Integer)
    response_body: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint(
            "actor_key", "operation", "idempotency_key", name="uq_idempotency_actor_operation_key"
        ),
    )


class UsageLedger(Base):
    __tablename__ = "usage_ledgers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    usage_date: Mapped[date] = mapped_column(Date)
    session_count: Mapped[int] = mapped_column(Integer, default=0)
    live_seconds: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (UniqueConstraint("user_id", "usage_date", name="uq_usage_user_date"),)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    actor_id: Mapped[str | None] = mapped_column(String(128), index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    target_type: Mapped[str] = mapped_column(String(64))
    target_id: Mapped[str | None] = mapped_column(String(128))
    request_id: Mapped[str] = mapped_column(String(36), index=True)
    safe_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
