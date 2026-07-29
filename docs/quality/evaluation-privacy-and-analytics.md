# Evaluation, Privacy, and Analytics

## Evaluation Contract

Feedback explains task success and the main obstacle to independent completion. It is not a single
opaque model score.

| Dimension | Source | Rule |
|---|---|---|
| Task completion | Deterministic | Required outcome resolved and all mandatory slots confirmed |
| Slot coverage | Deterministic | Count of mission details confirmed by sequenced tool events |
| Independence | Deterministic | Weighted Repeat, Slower, Meaning, Hint, and retry use |
| Timing | Deterministic | Valid duration relative to the frozen mode limit |
| Comprehension | Structured evaluator | Relevance, correct meaning, and appropriate repair |
| Grammar | Structured evaluator | Only errors that change or obscure meaning |
| Clarity | Calibrated evaluator or human | Must abstain when evidence confidence is low |
| Strengths and next action | Structured evaluator | Specific evidence and one short practice action |

Each dimension stores a value or `null`, evidence, confidence, and source. Automatic speech
recognition confidence alone cannot determine clarity. Repair language receives credit. An
accent-erasure recommendation is a release-blocking defect.

Evaluation uses the frozen transcript and session configuration. Pydantic validates strict JSON
output. Retry delays are 5, 30, and 120 seconds and are idempotent. Exhausted or invalid evaluation
stays pending rather than inventing a result.

## Learner Model

Pragati stores mission readiness, scenario strengths, recurring high-impact language patterns,
listening difficulty by speed, assistance use, and valid practice history. It recommends one next
action, such as a two-minute direct-answer drill or a Real-World retry. Readiness increases through
successful variations and lower assistance, not repeated memorization.

## Consent and Data Minimization

The public preview has no model call or storage. Its optional microphone visualizer runs locally.

Live-processing consent is versioned and required. Optional research and model-improvement consent
are separate, off by default, and never affect access. VishwaVaani v1 does not retain raw voice
audio.

Persisted learning data is limited to:

- account and onboarding state;
- consent versions;
- frozen mission/session configuration;
- sequenced transcript, slot, assistance, timing, and connection events;
- validated evaluation and learner state; and
- minimized audit, quota, idempotency, privacy, and outbox records.

Names, emails, transcripts, utterances, and audio must never be sent to product analytics, crash
reporting, traces, or general logs.

## Retention and Privacy Jobs

| Data | Retention |
|---|---|
| Account learning data | Until deletion or 12 months of inactivity |
| Identifiable product analytics | 90 days |
| Content-minimized security logs | 180 days |
| Prepared export artifacts | 24 hours |

Deletion revokes access immediately, removes active-system and processor data within seven days,
and expires backups within 35 days. Export and deletion require idempotency keys and produce
audited outbox jobs. Export objects use private storage and short-lived access.

Counsel must review the final consent, notice, processor contracts, retention implementation, and
incident workflow against the official Digital Personal Data Protection Rules and CERT-In
directions before beta traffic.

## Analytics Allowlist

PostHog receives only allowlisted, content-free events such as:

- waitlist submitted;
- onboarding step completed;
- mission briefing viewed;
- live connection succeeded or failed;
- mission completed or abandoned;
- repair control category used;
- evaluation became available;
- retry or recommended drill selected; and
- privacy job completed.

Allowed properties are coarse mission slug, mode, locale, version, state, latency bucket, assistance
count, and readiness label. User names, email addresses, transcripts, utterances, slot values, raw
audio, and free text are forbidden.

## Fairness and Release Audit

Before widening the beta, representative consenting Indian speakers from Hindi, Tamil, Telugu,
Bengali, and Marathi cohorts complete all five mission audit sets. Review false repair triggers,
valid completion, semantic scoring, clarity abstention, wording, and learner understanding.

At least 80% of moderated first-time users must start a mission unaided and 85% must understand
their feedback. No cohort advances with an open P0/P1 defect, incomplete localization approval, a
failed privacy job, or an unresolved accent-erasure finding.
