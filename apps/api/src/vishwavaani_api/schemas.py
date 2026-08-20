from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from vishwavaani_api.models import HintLocale, Readiness, SessionMode, SessionStatus

MissionSlug = Literal[
    "us-immigration",
    "hotel-check-in",
    "restaurant-ordering",
    "asking-directions",
    "missing-baggage",
]


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool
    request_id: str
    retry_after_seconds: int | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    live_missions_enabled: bool
    provider_conformance: Literal["passed", "failed", "not_configured", "unknown"]
    version: str


class AuthCodeRequest(BaseModel):
    email: EmailStr


class AuthCodeResponse(BaseModel):
    status: Literal["sent"] = "sent"
    dev_code: str | None = None


class AuthVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class WaitlistRequest(BaseModel):
    email: EmailStr
    goal: Literal["travel", "study", "work", "confidence"]
    is_adult: bool

    @field_validator("is_adult")
    @classmethod
    def adult_only(cls, value: bool) -> bool:
        if not value:
            raise ValueError("The closed beta is available to adults 18 and older.")
        return value


class WaitlistResponse(BaseModel):
    status: Literal["accepted", "already_registered"]


class InviteClaimRequest(BaseModel):
    code: str = Field(min_length=6, max_length=128)
    age_confirmed: bool


class InviteClaimResponse(BaseModel):
    status: Literal["redeemed"]
    onboarding_required: bool = True


class ConsentChoice(BaseModel):
    consent_type: Literal["core_live_processing", "research", "model_improvement"]
    version: str = Field(min_length=1, max_length=32)
    granted: bool


class ConsentRequest(BaseModel):
    choices: list[ConsentChoice] = Field(min_length=1, max_length=3)

    @field_validator("choices")
    @classmethod
    def core_consent_required(cls, choices: list[ConsentChoice]) -> list[ConsentChoice]:
        core = next(
            (choice for choice in choices if choice.consent_type == "core_live_processing"),
            None,
        )
        if core is None or not core.granted:
            raise ValueError("Core live-processing consent is required for live missions.")
        return choices


class ProfileUpdateRequest(BaseModel):
    hint_locale: HintLocale
    level: Literal["new", "growing", "ready"]
    caption_override: bool = False


class BootstrapResponse(BaseModel):
    user_id: str
    invite_redeemed: bool
    age_confirmed: bool
    core_consent_active: bool
    onboarding_completed: bool
    hint_locale: HintLocale
    level: str
    live_missions_enabled: bool
    limits: dict[str, int]


class MissionSummary(BaseModel):
    slug: MissionSlug
    title: str
    objective: str
    duration_minutes: int
    required_slots: list[str]
    version: str
    localizations: list[HintLocale]


class SessionCreateRequest(BaseModel):
    mission_slug: MissionSlug
    mode: SessionMode
    hint_locale: HintLocale
    caption_assisted: bool = False


class SessionCreateResponse(BaseModel):
    session_id: str
    status: SessionStatus
    expires_at: datetime
    frozen_versions: dict[str, str]
    turn_url: str


class MissionOpeningResponse(BaseModel):
    session_id: str
    status: SessionStatus
    agent_sequence: int
    agent_transcript: str
    agent_audio_base64: str


class AudioTurnResponse(BaseModel):
    session_id: str
    status: SessionStatus
    learner_sequence: int
    agent_sequence: int
    learner_transcript: str
    agent_transcript: str
    agent_audio_base64: str
    slot_events: list[str]
    mission_complete: bool


class RepairRequest(BaseModel):
    kind: Literal["repeat", "slower", "meaning", "hint", "mute", "unmute"]
    sequence: int = Field(ge=1)


class RepairResponse(BaseModel):
    accepted: bool
    sequence: int
    agent_transcript: str | None = None
    agent_audio_base64: str | None = None


class CaptionAssistanceRequest(BaseModel):
    enabled: bool


class CompleteSessionRequest(BaseModel):
    final_sequence: int = Field(ge=0)
    reason: Literal["completed", "user_exit", "connection_lost"]


class CompleteSessionResponse(BaseModel):
    session_id: str
    status: SessionStatus
    evaluation_status: Literal["pending", "not_scored"]


class ScoreDimension(BaseModel):
    value: float | None = Field(default=None, ge=0, le=1)
    evidence: list[str]
    confidence: float = Field(ge=0, le=1)
    source: Literal["deterministic", "evaluator", "human"]


class EvaluationResponse(BaseModel):
    session_id: str
    status: Literal["pending", "evaluated", "failed"]
    readiness: Readiness | None
    dimensions: dict[str, ScoreDimension]
    strengths: list[str]
    main_obstacle: str | None
    next_action: dict[str, Any] | None
    caption_assisted: bool


class ProgressResponse(BaseModel):
    independence_delta: float
    valid_completions: int
    repair_successes: int
    readiness_by_mission: dict[MissionSlug, Readiness]
    recommended_action: dict[str, Any] | None


class PrivacyExportResponse(BaseModel):
    generated_at: datetime
    data: dict[str, Any]


class PrivacyDeletionResponse(BaseModel):
    status: Literal["completed"] = "completed"


class ProviderConformanceResponse(BaseModel):
    passed: bool
    checks: dict[str, bool]
    safe_failures: list[str]


class SemanticEvaluation(BaseModel):
    comprehension: ScoreDimension
    grammar: ScoreDimension
    clarity: ScoreDimension
    strengths: list[str] = Field(min_length=1, max_length=3)
    main_obstacle: str = Field(min_length=1, max_length=600)
    next_action: dict[str, Any]

    @field_validator("clarity")
    @classmethod
    def clarity_must_abstain_when_uncertain(cls, value: ScoreDimension) -> ScoreDimension:
        if value.confidence < 0.7:
            return value.model_copy(update={"value": None})
        return value


class AuthPrincipal(BaseModel):
    model_config = ConfigDict(frozen=True)

    subject: str
    email: str | None = None
    is_admin: bool = False
