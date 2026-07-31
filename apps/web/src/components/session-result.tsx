"use client";

import { ArrowRight, Check, Clock3, Lightbulb, RotateCcw, Sparkles, Target } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { apiRequest } from "@/lib/api/client";
import type { Mission, Readiness, ScoreDimension } from "@/lib/types";

interface EvaluationData {
  session_id: string;
  status: "pending" | "evaluated" | "failed";
  readiness: Readiness | null;
  dimensions: Record<string, ScoreDimension>;
  strengths: string[];
  main_obstacle: string | null;
  next_action: Record<string, unknown> | null;
  caption_assisted: boolean;
}

const readinessLabels: Record<Readiness, string> = {
  "first-attempt": "First attempt",
  practicing: "Practicing",
  "nearly-ready": "Nearly ready",
  ready: "Ready",
};

export function SessionResult({ mission, nextMission }: { mission: Mission; nextMission: Mission }) {
  const query = useSearchParams();
  const sessionId = query.get("session");
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const result = await apiRequest<EvaluationData>(`/sessions/${sessionId}/evaluation`);
        if (cancelled) return;
        setEvaluation(result);
        if (result.status === "pending") timer = window.setTimeout(load, 2000);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load feedback.");
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="results-page" id="main-content">
        <header className="result-hero">
          <p className="eyebrow">No live result</p>
          <h1>Complete a live mission to see feedback.</h1>
          <Button href={`/app/missions/${mission.slug}`}>Start {mission.title}</Button>
        </header>
      </div>
    );
  }

  if (error || evaluation?.status === "failed") {
    return (
      <div className="results-page" id="main-content">
        <header className="result-hero">
          <p className="eyebrow">Feedback unavailable</p>
          <h1>Your attempt was saved, but no score was invented.</h1>
          <p>{error ?? "The AI evaluator returned an invalid result. Retry when you are ready."}</p>
          <Button href={`/app/missions/${mission.slug}`}><RotateCcw aria-hidden="true" /> Retry mission</Button>
        </header>
      </div>
    );
  }

  if (!evaluation || evaluation.status === "pending") {
    return (
      <div className="results-page" id="main-content">
        <header className="result-hero">
          <div className="result-orbit" aria-hidden="true"><span /><span /><span /></div>
          <p className="eyebrow">Mission saved · {mission.title}</p>
          <h1>Preparing your feedback…</h1>
          <p>The evaluator is checking the transcript. This page updates automatically.</p>
        </header>
      </div>
    );
  }

  const task = evaluation.dimensions.task_completion;
  const independence = evaluation.dimensions.independence;
  const taskPercent = task?.value == null ? "—" : `${Math.round(task.value * 100)}%`;
  const independencePercent = independence?.value == null ? "—" : `${Math.round(independence.value * 100)}%`;
  const nextAction = evaluation.next_action
    ? Object.values(evaluation.next_action).filter((value) => typeof value === "string").join(" · ")
    : "Retry one short exchange and answer the practical question first.";

  return (
    <div className="results-page" id="main-content">
      <header className="result-hero">
        <div className="result-orbit" aria-hidden="true"><span /><span /><span /></div>
        <p className="eyebrow">Mission complete · {mission.title}</p>
        <div className="readiness-label">{readinessLabels[evaluation.readiness ?? "first-attempt"]}</div>
        <h1>Your saved attempt has been evaluated.</h1>
        <p>{evaluation.main_obstacle ?? "Keep practicing this exchange with one clear detail at a time."}</p>
        <div className="result-summary">
          <span><Target aria-hidden="true" /><strong>{taskPercent}</strong><small>Task coverage</small></span>
          <span><Sparkles aria-hidden="true" /><strong>{independencePercent}</strong><small>Independence</small></span>
          <span><Clock3 aria-hidden="true" /><strong>{evaluation.caption_assisted ? "Yes" : "No"}</strong><small>Caption-assisted</small></span>
        </div>
      </header>

      <div className="result-content">
        <section className="outcome-card">
          <div className="card-heading">
            <span className="icon-chip success"><Check aria-hidden="true" /></span>
            <div><p className="eyebrow">What worked</p><h2>Evidence from this attempt</h2></div>
          </div>
          <div className="slot-grid">
            {(evaluation.strengths.length ? evaluation.strengths : task?.evidence ?? []).map((strength) => (
              <div key={strength}><Check aria-hidden="true" /><span><strong>{strength}</strong></span></div>
            ))}
          </div>
        </section>

        <section className="drill-card">
          <div>
            <p className="eyebrow">Recommended next action</p>
            <h2>{nextAction}</h2>
            <p>This recommendation came from the structured evaluator response.</p>
          </div>
          <div className="drill-visual"><Lightbulb aria-hidden="true" /></div>
        </section>

        <div className="result-actions">
          <Button href={`/app/missions/${mission.slug}`} variant="secondary"><RotateCcw aria-hidden="true" /> Retry this mission</Button>
          <Button href={`/app/missions/${nextMission.slug}`}>Next: {nextMission.title} <ArrowRight aria-hidden="true" /></Button>
        </div>
      </div>
    </div>
  );
}
