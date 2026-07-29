# Delivery Roadmap

## MVP Scope

The closed beta is a responsive production web application, not a native application. It includes
the public scripted preview, waitlist and invitation flow, Google/passwordless authentication,
adult and consent onboarding, all five travel missions, both voice modes, asynchronous evaluation,
Pragati progress, settings, and privacy jobs.

The five locked missions are:

1. US Immigration;
2. Hotel Check-in;
3. Restaurant Ordering;
4. Asking for Directions; and
5. Missing Baggage.

Native iOS and Android clients follow only after the web experience establishes reliable voice
connections, fair evaluation, useful feedback, and repeat practice.

## Delivery Environments

| Layer | Staging | Production |
|---|---|---|
| Web | Saved Sites versions used for review | Explicitly deployed Sites version |
| API | Railway API service | Separate Railway API service |
| Realtime | Railway controller with test provider/flags | Railway controller with conformance-passed provider |
| Evaluation and privacy | Railway Celery worker | Separate production worker |
| Data | Supabase staging project and Railway Redis | Supabase production project and Railway Redis |
| Migrations | Railway migration job before traffic shift | Same immutable migration from tested commit |

Every deploy is tied to the exact tested Git commit. The Sites project ID is stored in
`.openai/hosting.json`; runtime secrets are stored in the platform, never in that file or Git.

## Implementation Gates

| Gate | Required evidence |
|---|---|
| Source | Strict TypeScript, Python lint, generated OpenAPI client, reproducible pnpm and uv locks |
| Content | Every mission graph, branch, required slot, repair action, and localization key passes tests |
| Voice | Provider conformance passes SDP, data-channel events, sideband control, VAD, instructions, and tools |
| Evaluation | Deterministic scoring and validated structured output; invalid output remains pending |
| Privacy | No raw audio retention; consent versions, export, deletion, and processor deadlines verified |
| Accessibility | Keyboard, screen reader, reduced motion, denied microphone, long Indic strings, and WCAG 2.2 AA |
| Reliability | Load test passes at 25 concurrent sessions and the published latency/error targets |
| Fairness | Representative consenting speakers across all five language cohorts complete the audit set |

Accent-erasure wording is a release-blocking defect. Automatic speech recognition confidence alone
cannot determine clarity. Successful repair language receives credit.

## Test Matrix

- Unit: mission graphs, slots, repair actions, localization coverage, quota, consent transitions,
  deterministic scores, clarity abstention, and every frontend voice state.
- Contract: mock OpenAI-compatible Realtime server, malformed events, invalid SDP, unsupported
  capabilities, timeouts, sideband failures, and invalid evaluator JSON.
- Integration: Supabase authentication, invite redemption, migrations, Redis state, outbox
  delivery, retry timing, reconnect preservation, export, and deletion.
- Browser: public preview, waitlist, invitation, onboarding, five missions in two modes, all five
  hint languages, pending/failed evaluation, progress updates, and denied microphone permission.
- Accessibility and visual regression: 360, 768, 1024, and 1440 pixels; keyboard-only, screen
  reader, reduced motion, long native-script content, and visible focus.
- Load: 25 concurrent voice sessions with API availability at least 99.5%, connection success at
  least 98%, valid completion at least 97%, response-audio p95 at most three seconds, and evaluation
  p95 at most 30 seconds.

## Closed-Beta Rollout

Roll out in three cohorts and hold each for seven stable days:

| Cohort | Purpose | Advance only when |
|---|---|---|
| 20 internal users | Operational and content defects | No P0/P1 issue; privacy jobs and kill switches verified |
| 100 invited learners | Reliability, comprehension, and localization | All language approvals; moderated first-time success targets met |
| 500 invited learners | Capacity, retention, and fairness | Load targets, audit thresholds, and support processes remain stable |

At least 80% of moderated first-time users must start a mission without help, and at least 85% must
understand their feedback before a cohort advances.

## Pre-Beta External Work

The repository is deployment-ready without claiming that external credentials exist. Before live
traffic:

- configure Supabase Google/email authentication, database, and private storage;
- configure Railway staging and production services, migrations, and Redis;
- configure Resend, Turnstile, PostHog allowlists/flags, Sentry scrubbing, and OpenTelemetry;
- configure and pass the compatible AI provider conformance test;
- complete language review sign-off and representative speaker calibration; and
- obtain counsel review against the official Digital Personal Data Protection Rules and CERT-In
  directions.

The scripted guest preview remains available whenever auth, provider, evaluation, or live mission
flags are unavailable.
