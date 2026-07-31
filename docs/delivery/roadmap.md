# Delivery Roadmap

## MVP scope

The closed beta is a responsive web application with a public local-only preview, email-code
sign-in, invitation and consent onboarding, five travel missions in Coach and Real-World modes,
structured feedback, progress, and settings.

The five missions are US Immigration, Hotel Check-in, Restaurant Ordering, Asking for Directions,
and Missing Baggage.

## Deployment

| Layer | Deployment |
|---|---|
| Web | Next.js project on Vercel |
| API and evaluation | One FastAPI process on the user's backend machine |
| Data | The machine's existing PostgreSQL |
| Email | Resend |
| Voice and feedback | Configured OpenAI-compatible AI provider |

Run the Alembic migration before starting each new backend version. The only live-process command
is the Uvicorn command documented in the repository README. Live missions remain disabled until
all required provider credentials are configured.

## Release checks

- Email code request, verification, invite redemption, consent, and profile setup succeed.
- All five mission definitions and reviewed hint locales pass unit tests.
- WebRTC SDP exchange and Realtime data-channel events work with the chosen provider.
- Completed sessions save turns and produce schema-valid evaluation JSON.
- Invalid evaluator output produces a pending state, never fabricated feedback.
- The public preview makes no model call and raw microphone audio is never stored.
- Keyboard focus, reduced motion, microphone denial, and mobile layouts are checked.

## Rollout

Begin with internal users before widening the invite list. Add operational infrastructure only in
response to observed need: for example, a durable job queue becomes justified if single-process
evaluation regularly fails during restarts. It is not part of the initial deployment.
