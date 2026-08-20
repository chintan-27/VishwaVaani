# VishwaVaani

VishwaVaani is a voice-first English practice app for five real travel situations. The web MVP has
one deliberately small stack:

- Next.js frontend (local or Vercel)
- one FastAPI backend process
- PostgreSQL in production; SQLite for zero-setup local development
- Resend for six-digit sign-in emails
- one OpenAI-compatible provider for live voice and post-session evaluation

There is no Supabase, Turnstile, Redis, Celery, separate realtime server, analytics SDK, or Sites
deployment integration.

## Local development

The editable local environment files already exist and are ignored by Git:

- `apps/api/.env` — database, Resend, authentication, and AI credentials
- `apps/web/.env.local` — browser-facing API URL

Install once, then run the two application processes:

```bash
corepack pnpm install
uv sync --python 3.13
uv run fastapi dev apps/api/src/vishwavaani_api/main.py
corepack pnpm dev
```

Open `http://localhost:3000`. In local mode, Resend is optional: the sign-in screen displays the
six-digit code returned by the API. Use `VAANI-DEMO` as the local invite code.

To enable live AI missions, fill these values in `apps/api/.env` and restart FastAPI:

```dotenv
AI_BASE_URL=https://your-provider.example
AI_API_KEY=your-key
AI_MISSION_MODEL=your-tool-calling-chat-model
AI_EVALUATOR_MODEL=your-chat-model
AI_TRANSCRIPTION_MODEL=your-speech-to-text-model
AI_TTS_MODEL=your-text-to-speech-model
```

Live missions are turn-based, not a persistent connection: the browser records one clip per
utterance (push-to-talk, or automatic in Real-World mode) and posts it to FastAPI, which
transcribes it, drives the mission conversation through a tool-calling chat completion, and speaks
the reply back — so the provider key never enters frontend code. The same API process saves
transcripts and runs structured evaluation after completion. Raw audio is never stored, only the
transcript FastAPI produced from it.

## Production

Host `apps/web` as the Vercel project. Set `NEXT_PUBLIC_API_BASE_URL` to the public backend URL
ending in `/v1` and keep `NEXT_PUBLIC_DEMO_MODE=false`.

On the backend machine, set `DATABASE_URL` to the existing PostgreSQL database, set production
authentication secrets, Resend, and AI variables, then run:

```bash
uv sync --frozen --no-dev
uv run alembic upgrade head
uv run uvicorn vishwavaani_api.main:app --app-dir apps/api/src --host 0.0.0.0 --port 8000
```

Set `WEB_PUBLIC_URL` to the Vercel origin so browser requests pass the API's CORS policy.

## Verification

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
uv run pytest
corepack pnpm build
```

Detailed product and learning decisions remain under `docs/`.
