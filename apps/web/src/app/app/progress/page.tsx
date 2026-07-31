"use client";

import { ArrowUpRight, Check, ChevronRight, Lightbulb, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api/client";
import { missions } from "@/lib/missions";
import type { Readiness } from "@/lib/types";

interface ProgressData {
  independence_delta: number;
  valid_completions: number;
  repair_successes: number;
  readiness_by_mission: Record<string, Readiness>;
  recommended_action: { type?: string; mission_slug?: string; minutes?: number; skill?: string };
}

const readinessLabel: Record<Readiness, string> = {
  "first-attempt": "First attempt",
  practicing: "Practicing",
  "nearly-ready": "Nearly ready",
  ready: "Ready",
};

const readinessProgress: Record<Readiness, number> = {
  "first-attempt": 8,
  practicing: 45,
  "nearly-ready": 75,
  ready: 100,
};

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    apiRequest<ProgressData>("/progress").then(setProgress).catch(() => setProgress(null));
  }, []);

  const delta = Math.round((progress?.independence_delta ?? 0) * 100);
  const recommendation = missions.find(
    (mission) => mission.slug === progress?.recommended_action.mission_slug,
  );

  return (
    <div className="inside-page progress-page" id="main-content">
      <header className="inside-header">
        <p className="eyebrow">Pragati · Evidence of independence</p>
        <h1>{progress?.valid_completions ? "Your real results, in one place." : "Progress begins with a completed mission."}</h1>
        <p>Progress is measured by completed outcomes, successful recovery, and reduced assistance.</p>
      </header>

      <section className="independence-card">
        <div>
          <p className="eyebrow">Independence · Recorded attempts</p>
          <h2>{progress?.valid_completions ? "Measured from saved session evidence." : "No scored attempts yet."}</h2>
          <p>{progress?.valid_completions ? "This updates only after the AI evaluation finishes successfully." : "Start a mission when you are ready; practice-preview activity is never counted."}</p>
          <div className="metric-row">
            <span><strong>{delta > 0 ? `+${delta}%` : `${delta}%`}</strong><small>Independence change</small></span>
            <span><strong>{progress?.valid_completions ?? 0}</strong><small>Valid completions</small></span>
            <span><strong>{progress?.repair_successes ?? 0}</strong><small>Successful repairs</small></span>
          </div>
        </div>
        <div className="progress-chart" aria-label="Valid completion count">
          {[1, 2, 3, 4].map((attempt) => (
            <div key={attempt}><i style={{ height: attempt <= (progress?.valid_completions ?? 0) ? "75%" : "8%" }} /><span>A{attempt}</span></div>
          ))}
        </div>
      </section>

      <section className="skill-map">
        <div className="section-heading split">
          <div><p className="eyebrow">Mission readiness</p><h2>What can you do independently?</h2></div>
          <span className="fairness-chip"><ShieldCheck aria-hidden="true" /> Clarity can abstain</span>
        </div>
        <div className="skill-table" role="table" aria-label="Mission readiness">
          {missions.map((mission) => {
            const readiness = progress?.readiness_by_mission[mission.slug] ?? "first-attempt";
            const missionProgress = readinessProgress[readiness];
            return (
              <Link role="row" href={`/app/missions/${mission.slug}`} key={mission.slug}>
                <span className="mission-dot" style={{ background: mission.color }} />
                <span role="cell"><strong>{mission.title}</strong><small>{mission.eyebrow}</small></span>
                <span role="cell" className="progress-line"><i style={{ width: `${missionProgress}%` }} /></span>
                <strong role="cell">{readinessLabel[readiness]}</strong>
                <ChevronRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="growth-grid">
        <article>
          <span className="icon-chip success"><Check aria-hidden="true" /></span>
          <p className="eyebrow">Recorded evidence</p>
          <h2>Repair moments</h2>
          <p>Successful recovery language counted across evaluated missions.</p>
          <strong>{progress?.repair_successes ?? 0} observed <ArrowUpRight aria-hidden="true" /></strong>
        </article>
        <article>
          <span className="icon-chip warm"><Target aria-hidden="true" /></span>
          <p className="eyebrow">Evaluation status</p>
          <h2>{progress?.valid_completions ? "Feedback available" : "Waiting for your first result"}</h2>
          <p>Semantic feedback appears only when the AI returns valid structured output.</p>
          <strong>{progress?.valid_completions ?? 0} evaluated <ArrowUpRight aria-hidden="true" /></strong>
        </article>
        <article>
          <span className="icon-chip agent"><Lightbulb aria-hidden="true" /></span>
          <p className="eyebrow">Next recommendation</p>
          <h2>{recommendation?.title ?? "US Immigration · Coach"}</h2>
          <p>Chosen from your stored readiness and completion evidence.</p>
          <Link href={`/app/missions/${recommendation?.slug ?? "us-immigration"}`}>View mission <ArrowUpRight aria-hidden="true" /></Link>
        </article>
      </section>
    </div>
  );
}
