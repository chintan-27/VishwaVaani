# System Architecture

## Runtime

VishwaVaani uses two application processes and one database.

```mermaid
flowchart LR
    Browser[Next.js on Vercel] -->|record one clip per turn| API[One FastAPI process]
    API --> PostgreSQL[(Existing PostgreSQL)]
    API --> Resend[Resend email]
    API -->|transcribe, chat, speak| AI[OpenAI-compatible AI]
```

The public preview is scripted and local-only. Live users request a six-digit email code, receive a
signed VishwaVaani access token, redeem an invitation, accept live-processing consent, and choose
their preferences. Authentication needs no separate identity platform.

## AI flow

FastAPI creates the durable session; the AI key never reaches the browser. Live missions are
turn-based, not a persistent connection: the browser records one clip per learner utterance and
posts it to FastAPI, which transcribes it, drives the mission conversation through a tool-calling
chat completion (`record_slot` / `complete_mission`), and synthesizes the reply — returned to the
browser as audio to play. Each turn is saved to PostgreSQL as it's produced; raw audio is never
saved, only the transcript FastAPI itself generated from it.

When a mission completes, the same FastAPI process computes deterministic task evidence and calls
Chat Completions for validated semantic feedback. If the evaluator fails or returns invalid JSON,
the result stays pending rather than displaying made-up scores. This single-process background
work is an intentional MVP tradeoff; it can move to a durable queue later only if actual load
requires one.

## Configuration

Backend runtime configuration lives in `apps/api/.env` locally and machine environment variables
in production. Required production values are:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_CODE_PEPPER`
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- `AI_BASE_URL`, `AI_API_KEY`, `AI_MISSION_MODEL`, and `AI_EVALUATOR_MODEL`
- `AI_TRANSCRIPTION_MODEL` and `AI_TTS_MODEL` when the provider's compatible model names differ
  from the defaults
- `ADMIN_API_KEY`

Provider paths remain configurable for compatible endpoints. The frontend needs only
`NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_DEMO_MODE=false`.

## Deployment boundary

Vercel hosts only Next.js. The user's backend machine runs migrations and one Uvicorn/FastAPI
process against the user's existing PostgreSQL. Resend and the configured AI provider are the only
external services needed by the product.
