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
import { useEffect, useMemo, useRef, useState } from "react";
import { createMachine } from "xstate";

import { AudioOrb } from "@/components/audio-orb";
import { Button } from "@/components/button";
import { apiRequest } from "@/lib/api/client";
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
    agent_speaking: { on: { AGENT_DONE: "ready", START_TALK: "recording", COMPLETE: "completed", PAUSE: "paused", FAIL: "failed" } },
    ready: { on: { START_TALK: "recording", COMPLETE: "completed", PAUSE: "paused", FAIL: "failed" } },
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

interface CreatedSession {
  session_id: string;
  turn_url: string;
  frozen_versions: Record<string, string>;
}

interface MissionOpening {
  agent_sequence: number;
  agent_transcript: string;
  agent_audio_base64: string;
}

interface AudioTurnResult {
  agent_sequence: number;
  agent_transcript: string;
  agent_audio_base64: string;
  slot_events: string[];
  mission_complete: boolean;
}

interface RepairResult {
  agent_transcript: string | null;
  agent_audio_base64: string | null;
}

/** Voice-activity thresholds for hands-free auto-record: the mic meter (see audio-preview.tsx for
 * the same technique) never reads below ~0.08 at rest, so 0.16 is comfortably above room noise. */
const VAD_START_LEVEL = 0.16;
const VAD_STOP_LEVEL = 0.11;
const VAD_SILENCE_HANGOVER_MS = 900;

function playBase64Audio(base64: string, mimeType = "audio/mpeg"): Promise<void> {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const audio = new Audio(url);
  return new Promise((resolve) => {
    const cleanup = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });
    void audio.play().catch(cleanup);
  });
}

function pickRecorderMimeType(): string | undefined {
  if (typeof window === "undefined" || !window.MediaRecorder) return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find(
    (type) => window.MediaRecorder.isTypeSupported?.(type),
  );
}

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
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("Starting your conversation…");
  const [micLevel, setMicLevel] = useState(0.18);
  const sessionIdRef = useRef<string | null>(null);
  const turnSequenceRef = useRef(0);
  const repairSequenceRef = useRef(0);
  const startRecordingRef = useRef<(() => void) | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const state = snapshot.value as VoiceState;
  const realWorld = mode === "real_world";
  // Fail closed: a missing/misconfigured build-time env var must land on the real product,
  // not silently swap live users onto the scripted tour.
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  // Imperative loops below (the mic meter / VAD) live for the whole session and cannot pick up
  // fresh `state`/`muted` from a closure without re-running the whole effect, so mirror them here.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!isDemoMode) return;
    if (state !== "connecting") return;
    const timer = window.setTimeout(() => send({ type: "CONNECTED" }), 900);
    return () => window.clearTimeout(timer);
  }, [isDemoMode, send, state]);

  useEffect(() => {
    if (!isDemoMode) return;
    if (state !== "agent_speaking") return;
    const timer = window.setTimeout(() => send({ type: "AGENT_DONE" }), 1800);
    return () => window.clearTimeout(timer);
  }, [isDemoMode, send, state, turn]);

  useEffect(() => {
    if (!isDemoMode) return;
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
  }, [isDemoMode, mission.slug, router, send, state, turn]);

  useEffect(() => {
    if (isDemoMode) return;
    let disposed = false;
    let micStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let analyserData: Uint8Array<ArrayBuffer> | null = null;
    let recorder: MediaRecorder | null = null;
    let recordedChunks: BlobPart[] = [];
    let recordingStartedAt = 0;
    let silenceStartedAt: number | null = null;
    let meterFrame: number | null = null;
    const coveredSlots = new Set<string>();

    const applySlotEvents = (slots: string[]) => {
      for (const slot of slots) coveredSlots.add(slot);
      setTurn(Math.min(coveredSlots.size, mission.requiredSlots.length - 1));
    };

    const finishSession = async () => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      try {
        await apiRequest(`/sessions/${sessionId}/complete`, {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
          body: JSON.stringify({ final_sequence: turnSequenceRef.current, reason: "completed" }),
        });
        send({ type: "COMPLETE" });
        router.push(`/app/results/${mission.slug}?session=${sessionId}`);
      } catch (requestError) {
        setLiveError(requestError instanceof Error ? requestError.message : "Could not finish the session.");
        send({ type: "FAIL" });
      }
    };

    const submitAudioTurn = async (blob: Blob, endedAtMs: number) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      const form = new FormData();
      form.set("sequence", String(turnSequenceRef.current + 1));
      form.set("started_at_ms", "0");
      form.set("ended_at_ms", String(Math.max(0, endedAtMs)));
      form.set("audio", blob, "turn.webm");
      try {
        const result = await apiRequest<AudioTurnResult>(`/sessions/${sessionId}/turns/audio`, {
          method: "POST",
          body: form,
        });
        if (disposed) return;
        turnSequenceRef.current = result.agent_sequence;
        applySlotEvents(result.slot_events);
        send({ type: "RESPONSE_READY" });
        setLiveTranscript(result.agent_transcript);
        await playBase64Audio(result.agent_audio_base64);
        if (disposed) return;
        if (result.mission_complete) {
          await finishSession();
        } else {
          send({ type: "AGENT_DONE" });
        }
      } catch (requestError) {
        if (disposed) return;
        setLiveError(requestError instanceof Error ? requestError.message : "Could not send that turn.");
        send({ type: "FAIL" });
      }
    };

    const stopRecording = () => {
      if (!recorder || recorder.state === "inactive") return;
      const activeRecorder = recorder;
      const endedAtMs = Date.now() - recordingStartedAt;
      recorder = null;
      send({ type: "STOP_TALK" });
      activeRecorder.addEventListener(
        "stop",
        () => {
          const blob = new Blob(recordedChunks, { type: activeRecorder.mimeType || "audio/webm" });
          recordedChunks = [];
          void submitAudioTurn(blob, endedAtMs);
        },
        { once: true },
      );
      activeRecorder.stop();
    };

    const startRecording = () => {
      if (!micStream || recorder) return;
      recordedChunks = [];
      recordingStartedAt = Date.now();
      const mimeType = pickRecorderMimeType();
      const nextRecorder = new MediaRecorder(micStream, mimeType ? { mimeType } : undefined);
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
      };
      recorder = nextRecorder;
      nextRecorder.start();
      send({ type: "START_TALK" });
    };

    startRecordingRef.current = startRecording;
    stopRecordingRef.current = stopRecording;

    const meter = () => {
      if (analyser && analyserData) {
        analyser.getByteFrequencyData(analyserData);
        const average =
          analyserData.reduce((total, value) => total + value, 0) / analyserData.length / 255;
        setMicLevel(Math.max(0.08, average));

        // Hands-free auto-record: start on a burst of energy, stop after a sustained quiet
        // stretch. Coach mode ignores this entirely and uses the push-to-talk handlers instead.
        if (realWorld && !mutedRef.current) {
          if (stateRef.current === "ready" && average > VAD_START_LEVEL) {
            startRecording();
          } else if (stateRef.current === "recording") {
            if (average < VAD_STOP_LEVEL) {
              silenceStartedAt ??= performance.now();
              if (performance.now() - silenceStartedAt > VAD_SILENCE_HANGOVER_MS) {
                silenceStartedAt = null;
                stopRecording();
              }
            } else {
              silenceStartedAt = null;
            }
          }
        }
      }
      meterFrame = requestAnimationFrame(meter);
    };

    const start = async () => {
      try {
        const created = await apiRequest<CreatedSession>("/sessions", {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
          body: JSON.stringify({
            mission_slug: mission.slug,
            mode,
            hint_locale: locale,
            caption_assisted: false,
          }),
        });
        if (disposed) return;
        sessionIdRef.current = created.session_id;

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (disposed) {
          micStream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        audioContext.createMediaStreamSource(micStream).connect(analyser);
        analyserData = new Uint8Array(analyser.frequencyBinCount);
        meter();

        const turnBase = created.turn_url.replace("/v1", "");
        const opening = await apiRequest<MissionOpening>(`${turnBase}/start`, { method: "POST" });
        if (disposed) return;
        turnSequenceRef.current = opening.agent_sequence;
        send({ type: "CONNECTED" });
        setLiveTranscript(opening.agent_transcript);
        await playBase64Audio(opening.agent_audio_base64);
        if (disposed) return;
        send({ type: "AGENT_DONE" });
      } catch (requestError) {
        if (disposed) return;
        setLiveError(requestError instanceof Error ? requestError.message : "Could not start the live mission.");
        send({ type: "FAIL" });
      }
    };

    void start();
    return () => {
      disposed = true;
      startRecordingRef.current = null;
      stopRecordingRef.current = null;
      if (meterFrame) cancelAnimationFrame(meterFrame);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      void audioContext?.close();
      micStream?.getTracks().forEach((track) => track.stop());
    };
  }, [isDemoMode, locale, mission, mode, realWorld, router, send]);

  const displayLine = useMemo(
    () => isDemoMode
      ? mission.slug === "us-immigration" ? script[turn] : getMissionPrompt(mission, turn)
      : liveTranscript,
    [isDemoMode, liveTranscript, mission, turn],
  );

  const talkStart = () => {
    if (state !== "ready") return;
    if (isDemoMode) {
      send({ type: "START_TALK" });
      return;
    }
    startRecordingRef.current?.();
  };
  const talkStop = () => {
    if (state !== "recording") return;
    if (isDemoMode) {
      send({ type: "STOP_TALK" });
      return;
    }
    stopRecordingRef.current?.();
  };

  const requestRepair = (kind: "repeat" | "slower" | "meaning" | "hint") => {
    const sessionId = sessionIdRef.current;
    if (isDemoMode || !sessionId) return;
    repairSequenceRef.current += 1;
    apiRequest<RepairResult>(`/sessions/${sessionId}/repairs`, {
      method: "POST",
      body: JSON.stringify({ kind, sequence: repairSequenceRef.current }),
    })
      .then((result) => {
        if (!result.agent_audio_base64) return;
        setLiveTranscript(result.agent_transcript ?? "");
        void playBase64Audio(result.agent_audio_base64);
      })
      .catch((requestError) => {
        setLiveError(requestError instanceof Error ? requestError.message : "Could not request help.");
      });
  };

  const toggleMute = () => setMuted((current) => !current);

  const toggleCaptions = () => {
    const nextCaptionAssisted = !captionAssisted;
    setCaptionAssisted(nextCaptionAssisted);
    const sessionId = sessionIdRef.current;
    if (!isDemoMode && sessionId) {
      void apiRequest(`/sessions/${sessionId}/caption-assistance`, {
        method: "PUT",
        body: JSON.stringify({ enabled: nextCaptionAssisted }),
      }).catch((requestError) => {
        setCaptionAssisted(!nextCaptionAssisted);
        setLiveError(requestError instanceof Error ? requestError.message : "Could not change captions.");
      });
    }
  };

  const togglePause = () => {
    send({ type: state === "paused" ? "RESUME" : "PAUSE" });
  };

  const endWithoutScoring = async () => {
    const sessionId = sessionIdRef.current;
    if (!isDemoMode && sessionId) {
      try {
        await apiRequest(`/sessions/${sessionId}/complete`, {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
          body: JSON.stringify({ final_sequence: turnSequenceRef.current, reason: "user_exit" }),
        });
      } catch {
        // Navigating away still tears down the microphone via the effect cleanup.
      }
    }
    router.push(`/app/missions/${mission.slug}`);
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
        <div
          className="session-progress"
          aria-label={`Step ${turn + 1} of ${mission.requiredSlots.length}`}
        >
          {mission.requiredSlots.map((slot, index) => (
            <i className={index <= turn ? "active" : ""} key={slot} />
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

        {liveError && <p className="config-note" role="alert">{liveError}</p>}

        <AudioOrb
          state={state}
          level={state === "recording" ? (isDemoMode ? 0.68 : micLevel) : 0.18}
        />

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
          <Button variant="ghost" onClick={() => requestRepair("repeat")}>
            <RotateCcw aria-hidden="true" /> Repeat
          </Button>
          <Button variant="ghost" onClick={() => requestRepair("slower")}>
            <Gauge aria-hidden="true" /> Slower
          </Button>
          {!realWorld && (
            <>
              <Button variant="ghost" title={repairPhrases.meaning.hints[locale]} onClick={() => requestRepair("meaning")}>
                <Accessibility aria-hidden="true" /> Meaning
              </Button>
              <Button variant="ghost" onClick={() => { setHintOpen((open) => !open); requestRepair("hint"); }}>
                <Lightbulb aria-hidden="true" /> Hint
              </Button>
            </>
          )}
          {realWorld && (
            <>
              <Button variant="ghost" onClick={toggleMute}>
                {muted ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="ghost"
                onClick={toggleCaptions}
                aria-pressed={captionAssisted}
              >
                <Accessibility aria-hidden="true" /> Captions
              </Button>
            </>
          )}
        </div>

        {realWorld ? (
          <div
            className={`hands-free-control ${state === "recording" ? "active" : ""}`}
            role="status"
          >
            <Mic aria-hidden="true" />
            <span>
              <strong>{muted ? "Microphone muted" : "Listening hands-free"}</strong>
              <small>{muted ? "Use Unmute to continue" : state === "recording" ? "We can hear you" : "Speak when ready · voice detection is on"}</small>
            </span>
          </div>
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
          onClick={togglePause}
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
              <Button onClick={endWithoutScoring} variant="danger">
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
