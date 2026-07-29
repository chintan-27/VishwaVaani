export const hintLocales = ["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"] as const;
export type HintLocale = (typeof hintLocales)[number];

export const sessionModes = ["coach", "real_world"] as const;
export type SessionMode = (typeof sessionModes)[number];

export const missionSlugs = [
  "us-immigration",
  "hotel-check-in",
  "restaurant-ordering",
  "asking-directions",
  "missing-baggage",
] as const;
export type MissionSlug = (typeof missionSlugs)[number];

export type SessionStatus =
  | "created"
  | "connecting"
  | "active"
  | "reconnecting"
  | "completed"
  | "abandoned"
  | "failed"
  | "evaluation-pending"
  | "evaluated";

export type VoiceState =
  | "connecting"
  | "agent_speaking"
  | "ready"
  | "recording"
  | "thinking"
  | "reconnecting"
  | "paused"
  | "completed"
  | "failed";

export type Readiness = "first-attempt" | "practicing" | "nearly-ready" | "ready";

export type ScoreSource = "deterministic" | "evaluator" | "human";

export interface ScoreDimension {
  value: number | null;
  evidence: string[];
  confidence: number;
  source: ScoreSource;
}

export interface LocalizedPhrase {
  en: string;
  hints: Record<HintLocale, string>;
}

export interface Mission {
  slug: MissionSlug;
  eyebrow: string;
  title: string;
  objective: string;
  description: string;
  duration: string;
  difficulty: "Beginner" | "Growing" | "Challenge";
  location: string;
  number: string;
  accent: string;
  color: string;
  preparation: LocalizedPhrase[];
  requiredSlots: string[];
}
