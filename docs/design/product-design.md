# Product Design

## Experience Model

VishwaVaani should feel like a mission dashboard, not a digital textbook. The home screen presents one clear next action—start today’s mission—and speaking screens center a large, accessible voice control.

A standard session follows this loop:

1. Introduce the mission and its success criteria.
2. Rehearse essential phrases.
3. Complete a guided conversation.
4. Retry independently.
5. Handle a variation or pressure round.
6. Review feedback and launch targeted practice.

## Practice Modes

**Coach Mode** supports A1–A2 learners with slower speech, repeat and hint controls, optional translation, and a visible transcript. It should tolerate longer thinking pauses and provide supportive recovery.

**Real-World Mode** uses natural speed, realistic follow-ups, and delayed feedback. The transcript stays hidden during the task so the result measures listening and speaking rather than reading.

## Product Modules

| Module | Responsibility |
|---|---|
| Samvaad | Guided conversational lessons |
| Uccharan | Pronunciation, stress, rhythm, and clarity |
| Yatra | Travel missions and readiness checks |
| Abhyaas | Short daily speaking loops |
| Shabd | Scenario-linked vocabulary retrieval |
| Pragati | Progress, weaknesses, and next actions |

These modules form one loop: mission performance creates feedback; feedback launches a Uccharan or Shabd exercise; Pragati then selects the next Abhyaas session or Yatra retry.

## MVP Experience

The first end-to-end mission is US immigration. It must cover identity details, travel purpose, dates, accommodation, follow-up questions, clarification requests, post-session feedback, and a retry.

Subsequent missions are hotel check-in, restaurant ordering, asking for directions, and missing baggage. Defer social leaderboards, avatar-heavy polish, broad destination coverage, and offline voice until the core loop shows learning and retention.

See [learning design](learning-design.md) for progression rules and [system architecture](../architecture/system-architecture.md) for implementation boundaries.

