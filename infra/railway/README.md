# Railway services

Create separate staging and production Railway projects. Each environment uses the same repository
and lockfile, with four services:

| Service | Start command |
|---|---|
| `api` | `uv run uvicorn vishwavaani_api.main:app --app-dir apps/api/src --host 0.0.0.0 --port $PORT` |
| `realtime-controller` | `uv run python -m vishwavaani_api.realtime_controller` |
| `worker` | `uv run celery -A vishwavaani_api.worker.app worker --loglevel=INFO --concurrency=4` |
| `migrate` | `uv run alembic upgrade head` |

Provision managed PostgreSQL and Redis, bind their private connection variables to all runtime
services, and run `migrate` before shifting API traffic. The frontend kill switch remains off until
`scripts/provider_conformance.py` passes against the environment’s configured AI provider.
