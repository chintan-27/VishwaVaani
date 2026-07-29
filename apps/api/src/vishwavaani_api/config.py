from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "apps/api/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["local", "test", "staging", "production"] = "local"
    api_public_url: str = "http://localhost:8000"
    web_public_url: str = "http://localhost:3000"
    database_url: str = "sqlite+aiosqlite:///./vishwavaani.db"
    redis_url: str = "redis://localhost:6379/0"

    supabase_url: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_jwks_url: str | None = None
    supabase_service_role_key: str | None = None
    resend_api_key: str | None = None
    resend_from_email: str = "VishwaVaani <invite@example.com>"
    turnstile_secret_key: str | None = None
    posthog_api_key: str | None = None
    sentry_dsn: str | None = None
    otel_exporter_otlp_endpoint: str | None = None

    ai_base_url: str | None = None
    ai_api_key: str | None = None
    ai_realtime_model: str | None = None
    ai_evaluator_model: str | None = None
    ai_realtime_calls_path: str = "/v1/realtime/calls"
    ai_realtime_sideband_path: str = "/v1/realtime/calls/{call_id}/sideband"
    ai_chat_completions_path: str = "/v1/chat/completions"
    ai_connect_timeout_seconds: float = Field(default=8, gt=0, le=60)
    ai_read_timeout_seconds: float = Field(default=30, gt=0, le=180)
    ai_max_concurrency: int = Field(default=25, ge=1, le=250)
    ai_provider_health_ttl_seconds: int = Field(default=60, ge=5, le=600)

    auth_required: bool = True
    global_live_missions_enabled: bool = False
    admin_api_key: str | None = None

    daily_session_limit: int = 5
    daily_live_minutes_limit: int = 45
    coach_max_minutes: int = 10
    real_world_max_minutes: int = 8
    global_concurrent_sessions: int = 25
    max_reconnect_attempts: int = 2
    reconnect_window_seconds: int = 20

    @field_validator("database_url")
    @classmethod
    def normalize_postgres_scheme(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://") and "+asyncpg" not in value:
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @property
    def provider_configured(self) -> bool:
        return all(
            (
                self.ai_base_url,
                self.ai_api_key,
                self.ai_realtime_model,
                self.ai_evaluator_model,
            )
        )

    @property
    def live_missions_enabled(self) -> bool:
        return self.global_live_missions_enabled and self.provider_configured

    def validate_production(self) -> None:
        if self.app_env != "production":
            return
        required = {
            "DATABASE_URL": self.database_url if "sqlite" not in self.database_url else None,
            "SUPABASE_JWKS_URL": self.supabase_jwks_url,
            "ADMIN_API_KEY": self.admin_api_key,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Missing production settings: {', '.join(missing)}")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_production()
    return settings
