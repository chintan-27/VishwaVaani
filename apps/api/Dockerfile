FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.11.18 /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY apps/api ./apps/api
COPY packages/contracts ./packages/contracts
COPY alembic.ini ./

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "vishwavaani_api.main:app", "--app-dir", "apps/api/src", "--host", "0.0.0.0", "--port", "8000"]
