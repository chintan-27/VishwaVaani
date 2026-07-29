"use client";

import { Check, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AudioOrb } from "@/components/audio-orb";
import { Button } from "@/components/button";
import type { VoiceState } from "@/lib/types";

const exchange = [
  {
    agent: "Good evening. What is the purpose of your visit?",
    learner: "I am here for a holiday.",
  },
  {
    agent: "Welcome. How long will you be staying?",
    learner: "I will stay for ten days.",
  },
];

export function AudioPreview() {
  const [voiceState, setVoiceState] = useState<VoiceState>("ready");
  const [level, setLevel] = useState(0.14);
  const [step, setStep] = useState(0);
  const [permission, setPermission] = useState<"idle" | "active" | "denied">("idle");
  const [finished, setFinished] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopMic = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    streamRef.current = null;
    audioContextRef.current = null;
    setPermission("idle");
    setLevel(0.14);
  }, []);

  useEffect(() => stopMic, [stopMic]);

  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 64;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      audioContextRef.current = context;
      setPermission("active");

      const draw = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((total, value) => total + value, 0) / data.length / 255;
        setLevel(Math.max(0.08, average));
        frameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      setPermission("denied");
    }
  };

  const speak = () => {
    setVoiceState("recording");
    window.setTimeout(() => {
      setVoiceState("thinking");
      window.setTimeout(() => {
        if (step === exchange.length - 1) {
          setFinished(true);
          setVoiceState("completed");
          stopMic();
        } else {
          setStep((current) => current + 1);
          setVoiceState("agent_speaking");
          window.setTimeout(() => setVoiceState("ready"), 1400);
        }
      }, 850);
    }, 1200);
  };

  return (
    <section className="preview-console" aria-labelledby="preview-title">
      <div className="preview-copy">
        <p className="eyebrow">A 30-second local preview</p>
        <h1 id="preview-title">Say it once. Feel the difference.</h1>
        <p className="lede">
          Try a scripted immigration exchange. There is no account, no AI model call, and no
          recording.
        </p>
        <div className="privacy-chip">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Your voice stays on this device</strong>
            The microphone only animates the orb and is never uploaded.
          </span>
        </div>
        <Button href="/waitlist" variant="secondary">
          Join the closed beta
        </Button>
      </div>

      <div className="preview-stage">
        <div className="preview-status">
          <span>Guest preview</span>
          <span className="local-pill">
            <i /> Local only
          </span>
        </div>
        {!finished ? (
          <>
            <div className="agent-line">
              <span>Border officer</span>
              <p>“{exchange[step].agent}”</p>
            </div>
            <AudioOrb state={voiceState} level={level} />
            <div className="suggested-answer">
              <span>Your turn · try saying</span>
              <strong>“{exchange[step].learner}”</strong>
            </div>
            <div className="preview-controls">
              {permission === "idle" && (
                <Button onClick={enableMic} variant="secondary">
                  <Mic aria-hidden="true" /> Enable local visualizer
                </Button>
              )}
              {permission === "denied" && (
                <p className="permission-note" role="alert">
                  Microphone access was denied. You can still run the scripted preview.
                </p>
              )}
              <Button onClick={speak} disabled={voiceState !== "ready"}>
                <Sparkles aria-hidden="true" /> Simulate my answer
              </Button>
            </div>
          </>
        ) : (
          <div className="preview-finish">
            <span className="success-icon">
              <Check aria-hidden="true" />
            </span>
            <p className="eyebrow">Preview complete</p>
            <h2>You kept the conversation moving.</h2>
            <p>
              Live missions listen and respond in real time, then give one focused practice action.
            </p>
            <Button href="/waitlist">Request beta access</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFinished(false);
                setStep(0);
                setVoiceState("ready");
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
