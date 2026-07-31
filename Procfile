release: uv run alembic upgrade head
web: uv run uvicorn vishwavaani_api.main:app --app-dir apps/api/src --host 0.0.0.0 --port ${PORT:-8000}
