release: uv run alembic upgrade head
web: uv run uvicorn vishwavaani_api.main:app --app-dir apps/api/src --host 0.0.0.0 --port ${PORT:-8000}
realtime-controller: uv run python -m vishwavaani_api.realtime_controller
worker: uv run celery -A vishwavaani_api.worker.app worker --loglevel=INFO --concurrency=4
