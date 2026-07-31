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
  offer_url: string;
  frozen_versions: Record<string, string>;
}

interface RealtimeAnswer {
  answer_sdp: string;
}

function waitForIceGathering(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const onStateChange = () => {
      if (peer.iceGatheringState === "complete") {
        peer.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };
    peer.addEventListener("icegatheringstatechange", onStateChange);
  });
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
  const sessionIdRef = useRef<string | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const turnSequenceRef = useRef(0);
  const repairSequenceRef = useRef(0);
  const turnQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const state = snapshot.value as VoiceState;
  const realWorld = mode === "real_world";
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

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
    let peer: RTCPeerConnection | null = null;
    let microphone: MediaStream | null = null;
    let remoteAudio: HTMLAudioElement | null = null;

    const recordTurn = (
      actor: "agent" | "learner",
      transcript: string,
      providerEventId?: string,
      slotEvents: { slot: string }[] = [],
    ) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      const sequence = ++turnSequenceRef.current;
      turnQueueRef.current = turnQueueRef.current.then(() =>
        apiRequest(`/sessions/${sessionId}/turns`, {
          method: "POST",
          body: JSON.stringify({
            sequence,
            actor,
            transcript,
            started_at_ms: 0,
            ended_at_ms: 0,
            provider_event_id: providerEventId,
            slot_events: slotEvents,
          }),
        }),
      );
    };

    const complete = async () => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      try {
        await turnQueueRef.current;
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

    const handleProviderEvent = (rawEvent: MessageEvent<string>) => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(rawEvent.data) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = typeof event.type === "string" ? event.type : "";
      const eventId = typeof event.event_id === "string" ? event.event_id : undefined;

      if (type === "response.created") {
        setLiveTranscript("");
        send({ type: "RESPONSE_READY" });
      }
      if (type === "input_audio_buffer.speech_started") send({ type: "START_TALK" });
      if (type === "input_audio_buffer.speech_stopped") send({ type: "STOP_TALK" });
      if (type === "response.output_audio_transcript.delta" || type === "response.audio_transcript.delta") {
        const delta = typeof event.delta === "string" ? event.delta : "";
        setLiveTranscript((current) => current === "Starting your conversation…" ? delta : current + delta);
      }
      if (type === "response.output_audio_transcript.done" || type === "response.audio_transcript.done") {
        const transcript = typeof event.transcript === "string" ? event.transcript : "";
        if (transcript) {
          setLiveTranscript(transcript);
          recordTurn("agent", transcript, eventId);
        }
      }
      if (type === "conversation.item.input_audio_transcription.completed") {
        const transcript = typeof event.transcript === "string" ? event.transcript : "";
        if (transcript) recordTurn("learner", transcript, eventId);
      }
      if (type === "response.done") send({ type: "AGENT_DONE" });
      if (type === "response.function_call_arguments.done") {
        const name = typeof event.name === "string" ? event.name : "";
        const args = (() => {
          try {
            return typeof event.arguments === "string"
              ? JSON.parse(event.arguments) as Record<string, unknown>
              : {};
          } catch {
            return {};
          }
        })();
        if (name === "record_slot" && typeof args.slot === "string") {
          recordTurn("agent", "", eventId, [{ slot: args.slot }]);
        }
        const callId = typeof event.call_id === "string" ? event.call_id : undefined;
        if (callId && dataChannelRef.current?.readyState === "open") {
          dataChannelRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify({ accepted: true }),
            },
          }));
          if (name !== "complete_mission") {
            dataChannelRef.current.send(JSON.stringify({ type: "response.create" }));
          }
        }
        if (name === "complete_mission") void complete();
      }
      if (type === "error") {
        setLiveError("The AI voice service reported an error. Please end this attempt and retry.");
      }
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

        microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
        peer = new RTCPeerConnection();
        remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        peer.ontrack = (event) => {
          if (remoteAudio) remoteAudio.srcObject = event.streams[0];
        };
        const track = microphone.getAudioTracks()[0];
        track.enabled = realWorld;
        audioTrackRef.current = track;
        peer.addTrack(track, microphone);

        const channel = peer.createDataChannel("oai-events");
        dataChannelRef.current = channel;
        channel.onmessage = handleProviderEvent;
        channel.onopen = () => {
          if (disposed) return;
          send({ type: "CONNECTED" });
          channel.send(JSON.stringify({
            type: "session.update",
            session: {
              instructions: `You are the conversation partner for ${mission.title}. Objective: ${mission.objective} Ask one short question at a time. Never request real personal or document details. The required slots are ${mission.requiredSlots.join(", ")}. Call record_slot after each required detail is understood. Call complete_mission when all required slots are covered.`,
              tools: [
                { type: "function", name: "record_slot", description: "Record one required mission detail", parameters: { type: "object", properties: { slot: { type: "string", enum: mission.requiredSlots } }, required: ["slot"], additionalProperties: false } },
                { type: "function", name: "complete_mission", description: "Finish after every required detail is understood", parameters: { type: "object", properties: {}, additionalProperties: false } },
              ],
              tool_choice: "auto",
              turn_detection: realWorld ? { type: "server_vad", create_response: true } : null,
              input_audio_transcription: { model: created.frozen_versions.transcription_model },
            },
          }));
          channel.send(JSON.stringify({ type: "response.create" }));
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIceGathering(peer);
        const answer = await apiRequest<RealtimeAnswer>(created.offer_url.replace("/v1", ""), {
          method: "POST",
          body: JSON.stringify({ sdp: peer.localDescription?.sdp ?? offer.sdp }),
        });
        await peer.setRemoteDescription({ type: "answer", sdp: answer.answer_sdp });
      } catch (requestError) {
        if (disposed) return;
        setLiveError(requestError instanceof Error ? requestError.message : "Could not start the live mission.");
        send({ type: "FAIL" });
      }
    };

    void start();
    return () => {
      disposed = true;
      dataChannelRef.current?.close();
      peer?.close();
      microphone?.getTracks().forEach((track) => track.stop());
      if (remoteAudio) remoteAudio.srcObject = null;
      dataChannelRef.current = null;
      audioTrackRef.current = null;
    };
  }, [isDemoMode, locale, mission, mode, realWorld, router, send]);

  const displayLine = useMemo(
    () => isDemoMode
      ? mission.slug === "us-immigration" ? script[turn] : getMissionPrompt(mission, turn)
      : liveTranscript,
    [isDemoMode, liveTranscript, mission, turn],
  );

  const talkStart = () => {
    if (state === "ready") {
      if (!isDemoMode && audioTrackRef.current) audioTrackRef.current.enabled = true;
      send({ type: "START_TALK" });
    }
  };
  const talkStop = () => {
    if (state === "recording") {
      if (!isDemoMode && audioTrackRef.current) {
        audioTrackRef.current.enabled = false;
        if (dataChannelRef.current?.readyState === "open") {
          dataChannelRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
          dataChannelRef.current.send(JSON.stringify({ type: "response.create" }));
        }
      }
      send({ type: "STOP_TALK" });
    }
  };

  const requestRepair = (kind: "repeat" | "slower" | "meaning" | "hint", instruction?: string) => {
    const sessionId = sessionIdRef.current;
    if (!isDemoMode && sessionId) {
      repairSequenceRef.current += 1;
      void apiRequest(`/sessions/${sessionId}/repairs`, {
        method: "POST",
        body: JSON.stringify({ kind, sequence: repairSequenceRef.current }),
      }).catch((requestError) => {
        setLiveError(requestError instanceof Error ? requestError.message : "Could not request help.");
      });
      if (instruction && dataChannelRef.current?.readyState === "open") {
        dataChannelRef.current.send(JSON.stringify({
          type: "response.create",
          response: { instructions: instruction },
        }));
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!isDemoMode && audioTrackRef.current) {
      audioTrackRef.current.enabled = !nextMuted && state !== "paused";
    }
  };

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
    const resuming = state === "paused";
    if (!isDemoMode && audioTrackRef.current) {
      audioTrackRef.current.enabled = resuming && realWorld && !muted;
    }
    send({ type: resuming ? "RESUME" : "PAUSE" });
  };

  const endWithoutScoring = async () => {
    const sessionId = sessionIdRef.current;
    if (!isDemoMode && sessionId) {
      try {
        await turnQueueRef.current;
        await apiRequest(`/sessions/${sessionId}/complete`, {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
          body: JSON.stringify({ final_sequence: turnSequenceRef.current, reason: "user_exit" }),
        });
      } catch {
        // Navigating away still closes the browser media connection.
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

        {liveError && <p className="config-note" role="alert">{liveError}</p>}

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
          <Button variant="ghost" onClick={() => requestRepair("repeat", "Repeat your last question once, using the same meaning.")}>
            <RotateCcw aria-hidden="true" /> Repeat
          </Button>
          <Button variant="ghost" onClick={() => requestRepair("slower", "Repeat your last question more slowly, in short natural phrases.")}>
            <Gauge aria-hidden="true" /> Slower
          </Button>
          {!realWorld && (
            <>
              <Button variant="ghost" title={repairPhrases.meaning.hints[locale]} onClick={() => requestRepair("meaning", "Explain the meaning of your last question in simple English, then ask it again.")}>
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
