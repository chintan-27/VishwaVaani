# VishwaVaani

VishwaVaani is an India-first, voice-first English speaking coach for travel and everyday international conversations. The product is designed to help learners move from basic school English to functional spoken independence through realistic missions, pronunciation coaching, and structured feedback.

The first product slice focuses on US airport immigration, followed by hotel check-in, restaurant ordering, asking for directions, and missing-baggage scenarios. Learners practice in a supported Coach Mode before attempting natural-speed Real-World Mode.

## Documentation

| Area | Document |
|---|---|
| Product experience and module responsibilities | [Product design](docs/design/product-design.md) |
| Curriculum, progression, and pronunciation principles | [Learning design](docs/design/learning-design.md) |
| Voice, application, and data architecture | [System architecture](docs/architecture/system-architecture.md) |
| Market wedge, audience, and business model | [Market positioning](docs/strategy/market-positioning.md) |
| Scoring, personalization, privacy, and analytics | [Evaluation, privacy, and analytics](docs/quality/evaluation-privacy-and-analytics.md) |
| MVP scope, phases, team, and risks | [Delivery roadmap](docs/delivery/roadmap.md) |
| Evidence and detailed recommendations | [Research index](docs/research/README.md) |

## Current Status

This repository contains the production web MVP source, reusable FastAPI contracts, persistence
models and migration, provider conformance adapter, generated TypeScript API client, and automated
unit, contract, browser, and accessibility checks. Live missions remain fail-closed until Supabase,
Railway, and an OpenAI-compatible provider are configured and the deployment conformance test
passes. The public scripted preview remains available without those services.

## Development

```bash
corepack pnpm install
uv sync --python 3.13
corepack pnpm dev
uv run fastapi dev apps/api/src/vishwavaani_api/main.py
```

Run the primary checks with:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
uv run pytest
corepack pnpm build
corepack pnpm test:e2e
```

Regenerate the API contract and TypeScript client after route changes with
`corepack pnpm api:client`.

## Product Principles

- Optimize for real task completion, not generic lesson activity.
- Teach repair language such as asking for repetition or clarification.
- Improve intelligibility without treating accent identity as a defect.
- Keep live conversation low-latency and defer detailed evaluation until after the session.
- Treat recordings, transcripts, profiles, and scores as personal data.
