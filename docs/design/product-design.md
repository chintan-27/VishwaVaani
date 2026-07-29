# Product Design

## Experience Model

VishwaVaani is a cinematic, voice-first mission dashboard, not a digital textbook. The primary
navigation is Home, Missions, Progress, and Settings. Samvaad, Yatra, Uccharan, and Pragati remain
secondary labels that explain learning responsibilities without asking users to learn an internal
taxonomy.

The public journey is:

> landing page → local-only voice preview → waitlist → invitation → Google or passwordless email
> sign-in → invite redemption → adult and consent setup → hint language and level → microphone test

The preview is scripted, performs no model call, and stores nothing. An optional microphone
visualizer runs locally and explicitly says that audio stays on the device.

## Home and Mission Briefing

Home presents one dominant recommended action, one recent improvement with evidence, and a compact
readiness overview. All five missions remain selectable.

Each briefing includes:

- a practical objective and expected duration;
- three preparation phrases with reviewed native-script hints;
- Coach or Real-World mode selection;
- a microphone and accessibility reminder; and
- a prominent request to use fictional passport, booking, phone, and address details.

## Practice Modes

**Coach Mode** is push-to-talk. It shows the English transcript, permits native-script hints, and
offers Repeat, Slower, Meaning, and Hint. It tolerates longer pauses and makes recovery feel like a
normal conversation skill.

**Real-World Mode** uses hands-free voice detection. It offers Repeat, Slower, mute, and exit. The
transcript and hints stay hidden unless the learner enables the accessibility override. The result
then carries a clear `caption-assisted` marker.

Voice sessions use a distraction-free `100dvh` stage and always expose a text label for the current
state:

- connecting;
- agent speaking;
- ready;
- recording;
- thinking;
- reconnecting;
- paused;
- completed; and
- failed.

Confirmed turns survive bounded reconnection. If two attempts within 20 seconds fail, the session
ends without scoring the partial attempt.

## Results and Progress

Results lead with one readiness label: `First attempt`, `Practicing`, `Nearly ready`, or `Ready`.
The content order is:

1. successful practical outcomes;
2. one main obstacle;
3. one two- or three-minute drill;
4. transcript evidence;
5. retry; and
6. the next mission.

Progress emphasizes independent completion, successful repair, and reduced assistance. Streaks and
generic activity totals are intentionally absent.

## Visual System

The code-native interface uses:

| Token | Value | Use |
|---|---|---|
| Canvas | `#080C16` | Page and voice-stage background |
| Surface | `#0F1728` | Standard cards |
| Raised surface | `#18243A` | Dialogs and primary stage |
| Reading surface | `#F7F2E8` | Editorial principles |
| Primary | `#FFB15A` | Main actions and horizon warmth |
| Listening | `#68E0D1` | Learner microphone and local privacy |
| Agent | `#8D9CFF` | Conversation partner |
| Success | `#69D69F` | Completed outcomes |
| Error | `#FF7D86` | Recoverable failures and destructive controls |

Newsreader is self-hosted for display text, Inter for interface text, and Noto Sans families for
Devanagari, Tamil, Telugu, and Bengali scripts. Soft horizon gradients, restrained film grain,
mission-specific SVG scenery, and a Web Audio-driven orb create atmosphere without stock
photography, flags, mascots, or cultural stereotypes.

## Accessibility

Controls are at least 48 pixels, with visible keyboard focus and explicit state text. The layout
supports 360-pixel mobile, 768-pixel tablet, and a 1280-pixel desktop shell. Reduced-motion
preferences disable decorative movement. Color is never the only status signal, and the target is
Web Content Accessibility Guidelines (WCAG) 2.2 AA contrast.

See [learning design](learning-design.md) for progression and
[system architecture](../architecture/system-architecture.md) for runtime boundaries.
