"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMachine } from "@xstate/react";
import {
  Accessibility,
  Gauge,
  Hand,
  Headphones,
  Lightbulb,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createMachine } from "xstate";

import { AudioOrb } from "@/components/audio-orb";
import { Button } from "@/components/button";
import { localeLabels, repairPhrases } from "@/lib/missions";
import type { HintLocale, Mission, SessionMode, VoiceState } from "@/lib/types";

type SessionEvent =
  | { type: "CONNECTED" }
  | { type: "AGENT_DONE" }
  | { type: "START_TALK" }
  | { type: "STOP_TALK" }
  | { type: "RESPONSE_READY" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "FAIL" }
  | { type: "COMPLETE" };

export const voiceMachine = createMachine({
  types: {} as {
    events: SessionEvent;
  },
  initial: "connecting",
  states: {
    connecting: { on: { CONNECTED: "agent_speaking", FAIL: "failed" } },
    agent_speaking: { on: { AGENT_DONE: "ready", PAUSE: "paused", FAIL: "failed" } },
    ready: { on: { START_TALK: "recording", PAUSE: "paused", FAIL: "failed" } },
    recording: { on: { STOP_TALK: "thinking", PAUSE: "paused", FAIL: "failed" } },
    thinking: {
      on: { RESPONSE_READY: "agent_speaking", COMPLETE: "completed", FAIL: "failed" },
    },
    paused: { on: { RESUME: "ready", FAIL: "failed" } },
    completed: { type: "final" },
    failed: { type: "final" },
  },
});

const script = [
  "Good evening. May I see your passport, please?",
  "Thank you. What is the purpose of your visit?",
  "How long will you be staying in the United States?",
  "Where will you be staying?",
];

export function VoiceSession({
  mission,
  mode,
  locale = "hi-IN",
}: {
  mission: Mission;
  mode: SessionMode;
  locale?: HintLocale;
}) {
  const router = useRouter();
  const [snapshot, send] = useMachine(voiceMachine);
  const [turn, setTurn] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [captionAssisted, setCaptionAssisted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const state = snapshot.value as VoiceState;
  const realWorld = mode === "real_world";
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  useEffect(() => {
    if (state !== "connecting") return;
    const timer = window.setTimeout(() => send({ type: "CONNECTED" }), 900);
    return () => window.clearTimeout(timer);
  }, [send, state]);

  useEffect(() => {
    if (state !== "agent_speaking") return;
    const timer = window.setTimeout(() => send({ type: "AGENT_DONE" }), 1800);
    return () => window.clearTimeout(timer);
  }, [send, state, turn]);

  useEffect(() => {
    if (state !== "thinking") return;
    const timer = window.setTimeout(() => {
      if (turn >= 3) {
        send({ type: "COMPLETE" });
        window.setTimeout(() => router.push(`/app/results/${mission.slug}`), 750);
      } else {
        setTurn((current) => current + 1);
        send({ type: "RESPONSE_READY" });
      }
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [mission.slug, router, send, state, turn]);

  const displayLine = useMemo(
    () => (mission.slug === "us-immigration" ? script[turn] : getMissionPrompt(mission, turn)),
    [mission, turn],
  );

  const talkStart = () => {
    if (state === "ready") send({ type: "START_TALK" });
  };
  const talkStop = () => {
    if (state === "recording") send({ type: "STOP_TALK" });
  };

  return (
    <div className={`session-stage ${realWorld ? "real-world" : "coach"}`}>
      <header className="session-header">
        <div>
          <p className="eyebrow">
            {isDemoMode ? "Scripted product tour" : realWorld ? "Real-World Mode" : "Coach Mode"} ·{" "}
            {mission.title}
          </p>
          <div className="connection-state">
            <i /> {isDemoMode ? "Local interaction demo" : "Secure live session"} <span>•</span>{" "}
            {isDemoMode ? "No microphone audio processed" : "No audio stored"}
          </div>
        </div>
        <div className="session-progress" aria-label={`Turn ${turn + 1} of 4`}>
          {[0, 1, 2, 3].map((index) => (
            <i className={index <= turn ? "active" : ""} key={index} />
          ))}
        </div>
        <Button size="icon" variant="ghost" aria-label="Exit mission" onClick={() => setExitOpen(true)}>
          <X aria-hidden="true" />
        </Button>
      </header>

      <main className="session-main">
        <div className="role-label">
          <span className="role-avatar" aria-hidden="true">
            <Headphones />
          </span>
          <span>
            <small>Your conversation partner</small>
            <strong>{mission.slug === "us-immigration" ? "Border officer" : mission.location}</strong>
          </span>
        </div>

        {(!realWorld || captionAssisted) && (
          <div className="session-transcript" aria-live="polite">
            <p>“{displayLine}”</p>
            {captionAssisted && <span>Accessibility transcript · result will be caption-assisted</span>}
          </div>
        )}

        <AudioOrb state={state} level={state === "recording" ? 0.68 : 0.18} />

        {!realWorld && hintOpen && (
          <div className="native-hint" lang={locale.split("-")[0]}>
            <span>
              {localeLabels[locale].native} hint ·{" "}
              <button onClick={() => setHintOpen(false)}>Hide</button>
            </span>
            <strong>{mission.preparation[Math.min(turn, 2)].hints[locale]}</strong>
            <small>{mission.preparation[Math.min(turn, 2)].en}</small>
          </div>
        )}
      </main>

      <footer className="session-controls">
        <div className="repair-controls">
          <Button variant="ghost" onClick={() => setTurn((current) => current)}>
            <RotateCcw aria-hidden="true" /> Repeat
          </Button>
          <Button variant="ghost">
            <Gauge aria-hidden="true" /> Slower
          </Button>
          {!realWorld && (
            <>
              <Button variant="ghost" title={repairPhrases.meaning.hints[locale]}>
                <Accessibility aria-hidden="true" /> Meaning
              </Button>
              <Button variant="ghost" onClick={() => setHintOpen((open) => !open)}>
                <Lightbulb aria-hidden="true" /> Hint
              </Button>
            </>
          )}
          {realWorld && (
            <>
              <Button variant="ghost" onClick={() => setMuted((value) => !value)}>
                {muted ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCaptionAssisted((value) => !value)}
                aria-pressed={captionAssisted}
              >
                <Accessibility aria-hidden="true" /> Captions
              </Button>
            </>
          )}
        </div>

        {realWorld ? (
          <button
            className={`hands-free-control ${state === "recording" ? "active" : ""}`}
            onClick={() => (state === "recording" ? talkStop() : talkStart())}
            disabled={!["ready", "recording"].includes(state)}
          >
            {state === "recording" ? <Mic aria-hidden="true" /> : <Play aria-hidden="true" />}
            <span>
              <strong>{state === "recording" ? "Listening hands-free" : "Start your answer"}</strong>
              <small>{state === "recording" ? "Tap when you are finished" : "Voice detection is on"}</small>
            </span>
          </button>
        ) : (
          <button
            className={`push-to-talk ${state === "recording" ? "active" : ""}`}
            onPointerDown={talkStart}
            onPointerUp={talkStop}
            onPointerCancel={talkStop}
            onKeyDown={(event) => {
              if ((event.key === " " || event.key === "Enter") && !event.repeat) talkStart();
            }}
            onKeyUp={(event) => {
              if (event.key === " " || event.key === "Enter") talkStop();
            }}
            disabled={!["ready", "recording"].includes(state)}
          >
            <Hand aria-hidden="true" />
            <span>
              <strong>{state === "recording" ? "Keep speaking…" : "Hold to speak"}</strong>
              <small>Release when you are finished</small>
            </span>
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label={state === "paused" ? "Resume session" : "Pause session"}
          onClick={() => send({ type: state === "paused" ? "RESUME" : "PAUSE" })}
          disabled={state === "connecting"}
        >
          {state === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
      </footer>

      <Dialog.Root open={exitOpen} onOpenChange={setExitOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Leave this mission?</Dialog.Title>
            <Dialog.Description>
              Confirmed turns will be preserved, but a partial attempt will not receive a readiness
              result.
            </Dialog.Description>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="secondary">Keep practicing</Button>
              </Dialog.Close>
              <Button href={`/app/missions/${mission.slug}`} variant="danger">
                End without scoring
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function getMissionPrompt(mission: Mission, turn: number): string {
  const prompts: Record<string, string[]> = {
    "hotel-check-in": [
      "Good evening. Do you have a reservation?",
      "What name is the booking under?",
      "May I see some identification?",
      "Is there anything you would like to know about your stay?",
    ],
    "restaurant-ordering": [
      "Are you ready to order?",
      "Do you have any dietary requirements?",
      "Would you like anything to drink?",
      "Can I bring you anything else?",
    ],
    "asking-directions": [
      "Of course. Where are you trying to go?",
      "Do you see the bank across the road?",
      "Turn right after the bank, then take the second left.",
      "Would you like me to show you on the map?",
    ],
    "missing-baggage": [
      "I’m sorry about that. May I see your baggage tag?",
      "Can you describe the bag for me?",
      "What phone number can we reach you on?",
      "Where should we deliver the bag?",
    ],
  };
  return prompts[mission.slug]?.[turn] ?? "Tell me what you need help with.";
}
