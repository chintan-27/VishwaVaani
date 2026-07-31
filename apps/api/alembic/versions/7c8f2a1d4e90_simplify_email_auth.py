"""add simple email-code authentication

Revision ID: 7c8f2a1d4e90
Revises: bdcf533a2aff
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7c8f2a1d4e90"
down_revision: str | Sequence[str] | None = "bdcf533a2aff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "auth_codes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_codes_email_hash"), "auth_codes", ["email_hash"], unique=False)
    op.create_index(op.f("ix_auth_codes_expires_at"), "auth_codes", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_codes_expires_at"), table_name="auth_codes")
    op.drop_index(op.f("ix_auth_codes_email_hash"), table_name="auth_codes")
    op.drop_table("auth_codes")
