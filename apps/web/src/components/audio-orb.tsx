"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import type { VoiceState } from "@/lib/types";

const stateLabels: Record<VoiceState, string> = {
  connecting: "Connecting securely",
  agent_speaking: "Your guide is speaking",
  ready: "Ready when you are",
  recording: "Listening to you",
  thinking: "Understanding your answer",
  reconnecting: "Reconnecting",
  paused: "Session paused",
  completed: "Mission completed",
  failed: "Connection ended",
};

export function AudioOrb({
  state = "ready",
  level = 0.18,
  size = "large",
  showLabel = true,
}: {
  state?: VoiceState;
  level?: number;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const scale = reduceMotion ? 1 : 1 + Math.min(level, 1) * 0.1;

  return (
    <div className={cn("orb-wrap", `orb-${size}`, `orb-state-${state}`)}>
      <div className="orb-aura" aria-hidden="true" />
      <motion.div
        className="audio-orb"
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        aria-hidden="true"
      >
        <span className="orb-core" />
        <span className="orb-glint" />
      </motion.div>
      {showLabel && (
        <div className="orb-label" role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {stateLabels[state]}
        </div>
      )}
    </div>
  );
}

export { stateLabels };
