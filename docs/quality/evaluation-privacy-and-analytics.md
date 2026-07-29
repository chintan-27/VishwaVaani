# Evaluation, Privacy, and Analytics

## Performance Evaluation

Post-session feedback should explain both task success and the main obstacle to independence.

| Dimension | Observable evidence |
|---|---|
| Task completion | Required details exchanged and goal resolved |
| Comprehension | Relevant answers or appropriate repair requests |
| Independence | Hints, translations, repeats, and retries used |
| Fluency | Disruptive pauses, abandoned starts, and self-repairs |
| Clarity | Listener success and calibrated speech-recognition evidence |
| Grammar | Errors that change or obscure intended meaning |
| Confidence | Self-rating, retries, and completion under pressure |

Do not infer pronunciation quality from speech-recognition confidence alone. Calibrate scoring with representative Indian speech and periodic human audits. Feedback should remain specific, actionable, and non-judgmental.

## Learner Model

Store skill level, scenario strengths, recurring phrase and pronunciation patterns, listening difficulty by accent or speed, and practice history. Use these signals to select one next-best action—for example, repeat a hotel mission with a different voice or drill word stress before another attempt.

## Privacy Controls

Treat voice, transcripts, profiles, and evaluation results as personal data. The minimum controls are:

- separate consent for core processing, recording retention, and model-improvement use;
- explicit retention windows by data type;
- in-app deletion and export;
- encryption in transit and at rest;
- least-privilege access and audit logs;
- age gating and guardian controls before serving minors;
- region-aware data handling where required.

Training or product-improvement use of learner audio must be an explicit opt-in, never a condition of core service.

## Analytics

Measure mission starts and completions, response latency, repair and hint use, retries, feedback actions, next-day return, and subscription conversion. Use events to answer learning questions: which hint improves later independence, whether Uccharan drills transfer to Yatra performance, and where learners abandon a mission. Avoid engagement metrics that cannot be tied to learning or retention.

The supporting research and legal context are summarized in the [deep research report](../research/deep-research-report.md).

