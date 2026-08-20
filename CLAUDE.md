# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

VishwaVaani is a voice-first English practice app for five travel scenarios ("missions"). Two
processes only: a Next.js frontend and one FastAPI backend. No Supabase, Redis, Celery, queue,
separate realtime server, or analytics SDK — keep it that way.

Live missions are turn-based over REST, not a persistent WebRTC connection: the browser records
one push-to-talk (or hands-free VAD) clip at a time and FastAPI does speech-to-text, drives the
mission conversation through a tool-calling chat completion, then speech-to-text back — see
"Live mission turn path" below. This replaced an earlier WebRTC/SDP design; the provider in use
does not expose a realtime voice endpoint, only chat/audio completions.

## Commands

All commands run from the repo root. Python is managed by `uv` (root `pyproject.toml`, package at
`apps/api/src/vishwavaani_api`); JS by pnpm workspaces (`apps/web` is the only member).

```bash
corepack pnpm install && uv sync --python 3.13   # one-time setup
uv run fastapi dev apps/api/src/vishwavaani_api/main.py   # API on :8000
corepack pnpm dev                                          # web on :3000

pnpm check          # lint + typecheck + vitest + pytest + next build
pnpm test:e2e       # Playwright; boots both servers itself (uses ../../.venv/bin/uvicorn)
pnpm api:client     # regenerate OpenAPI + TS client (see Contract flow)
```

Single tests:

```bash
uv run pytest apps/api/tests/test_api.py::test_name
corepack pnpm --filter @vishwavaani/web test -- src/lib/missions.test.ts
corepack pnpm --filter @vishwavaani/web test:e2e -- --grep "public preview"
uv run ruff check .          # ruff is not wired into pnpm check; run it manually
```

Local dev needs no Postgres and no migrations: when `APP_ENV` is `local` or `test` the FastAPI
lifespan runs `Base.metadata.create_all` against SQLite (`vishwavaani.db`). `docker-compose.yml`
provides Postgres only if you want to rehearse production. Alembic ignores `sqlalchemy.url` in
`alembic.ini` — `alembic/env.py` overrides it from `DATABASE_URL` and swaps the async driver for
the sync one.

## Architecture

### Live mission turn path

Audio never reaches the browser's peer connection layer at all — there isn't one. Each learner
utterance is a self-contained HTTP request; the provider key never reaches frontend code because
FastAPI is the only thing that calls the provider.

1. `POST /v1/sessions` (Idempotency-Key required) — enforces invite/consent/quota, freezes mission
   version, prompt, rubric, models and `frozen_config` (required slots, graph, max duration) onto the
   session row, returns `turn_url` + `frozen_versions`.
2. `POST {turn_url}/start` — the one-time analogue of the old connection handshake: FastAPI calls
   `conversation.advance_mission_turn` with a synthetic kickoff message to get the agent's opening
   line, synthesizes it (`provider.synthesize`), persists it as `SessionTurn(actor="agent")`, and
   flips the session to `ACTIVE`. Returns the line as text + base64 audio.
3. `voice-session.tsx` records one clip per turn — `MediaRecorder` on push-to-talk release, or a
   client-side energy-threshold VAD loop in Real-World mode — and `POST`s it to `{turn_url}/audio`.
   FastAPI transcribes it (`provider.transcribe`), rebuilds the chat history from persisted
   `SessionTurn` rows (`conversation.build_messages`), and runs the tool-calling loop
   (`conversation.advance_mission_turn`) against the `record_slot` / `complete_mission` tools,
   capped at `MAX_TOOL_ROUNDS` so a provider that never stops calling tools can't hang a request.
   The reply is synthesized and returned as base64 audio; `mission_complete: true` in the response
   (or user exit) triggers `POST /sessions/{id}/complete`, which schedules
   `evaluate_session_async` as a FastAPI `BackgroundTask` (skipped when `APP_ENV=test`).
4. Repair controls (repeat/slower/meaning) reuse the same tool-calling call through
   `POST /sessions/{id}/repairs` but with `tools=[]` — the reply is a side interjection, not logged
   as a `SessionTurn` and doesn't touch `confirmed_sequence`. "Hint" never calls the provider; it's
   a client-only reveal of the pre-written native-language phrase.

`scoring.py` computes deterministic dimensions (slot coverage, independence, timing) locally;
`provider.evaluate` adds semantic ones via a separate json_schema chat completion. If the provider
fails the evaluation **stays `pending` rather than inventing a result** — re-completing the session
retries it. `clarity_score` abstains (value `null`) below 0.7 confidence. Raw audio is never stored
— only the transcript FastAPI itself produced.

### Demo mode gotcha

`NEXT_PUBLIC_DEMO_MODE === "true"` puts `voice-session.tsx` on canned scripts with no API calls at
all; anything else (including unset) is the real live path — this fails closed on purpose, so a
misconfigured deploy lands on the real product instead of silently degrading to the demo. Set it
explicitly to `true` in `apps/web/.env.local` when you want the scripted tour instead.

### Mission catalog is duplicated on purpose

- `apps/api/src/vishwavaani_api/mission_catalog.py` — authoritative slugs, `required_slots`, and the
  conversation `graph`; also the frozen `MISSION_VERSION` / `PROMPT_VERSION` / `RUBRIC_VERSION`
  strings written into every session.
- `apps/web/src/lib/missions.ts` — presentation copy plus per-locale Indic hint phrases
  (hi/ta/te/bn/mr), and `requiredSlots` again because the browser puts them in the tool schema.

Adding or renaming a mission means editing both, plus `missionSlugs` in `apps/web/src/lib/types.ts`.
Bump the version constants when prompts or rubrics change — sessions freeze them for reproducibility.

### Contract flow

`pnpm api:client` runs `scripts/export_openapi.py` → `packages/contracts/openapi.json` →
`scripts/generate_client.py` → `apps/web/src/lib/api/schema.d.ts` and `generated-client.ts`. Those
two files are generated; never hand-edit them. `apps/web/src/lib/api/client.ts` is the hand-written
fetch wrapper (bearer token from `localStorage`, `Idempotency-Key` passthrough, `ApiError`).

### Auth

Email six-digit code → HS256 JWT (`aud: vishwavaani-web`) stored in `localStorage`. In `local`/`test`
the `/auth/code` response echoes `dev_code` and an `X-Demo-User` header bypasses JWT entirely
(`auth.py`) — production must never run with `APP_ENV` unset. `VAANI-DEMO` is the local invite code.
`get_settings().validate_production()` hard-fails startup when production secrets are missing.

### Errors and idempotency

Raise `APIError` — `errors.py` renders every failure as
`{"error": {code, message, retryable, request_id, retry_after_seconds?}}` and the frontend `ApiError`
reads that shape. Middleware stamps `X-Request-ID` and `Cache-Control: no-store` on all responses.
`POST /sessions`, `/sessions/{id}/complete`, and `/invites/claim` require an `Idempotency-Key`
(8–128 chars); replays are matched by request fingerprint in `idempotency_records`, and a reused key
with a different body is a 409.

## Conventions

- Backend: ruff, line length 100, `select = E,F,I,UP,B,ASYNC`. Async SQLAlchemy 2.0 throughout.
- User-facing error messages are learner-facing prose, not developer strings — match the existing tone.
- Never recommend accent erasure in evaluation prompts or copy; credit repair language instead.
- `AGENTS.md` at the root is gitignored, stale (describes a docs-only repo), and should be ignored.
- Product/learning rationale lives in `docs/`; `docs/architecture/system-architecture.md` is the
  companion to this file.
