"use client";

import { ArrowRight, Check, ChevronRight, Clock3, Headphones, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/button";
import { MissionArtwork } from "@/components/mission-artwork";
import { apiRequest } from "@/lib/api/client";
import { missions } from "@/lib/missions";
import type { Readiness } from "@/lib/types";

interface ProgressData {
  independence_delta: number;
  valid_completions: number;
  repair_successes: number;
  readiness_by_mission: Record<string, Readiness>;
  recommended_action: { mission_slug?: string };
}

const readinessLabel: Record<Readiness, string> = {
  "first-attempt": "First attempt",
  practicing: "Practicing",
  "nearly-ready": "Nearly ready",
  ready: "Ready",
};

export default function AppHomePage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    apiRequest<ProgressData>("/progress").then(setProgress).catch(() => setProgress(null));
  }, []);

  const recommended = useMemo(
    () => missions.find((mission) => mission.slug === progress?.recommended_action.mission_slug) ?? missions[0],
    [progress],
  );
  const recommendedReadiness = progress?.readiness_by_mission[recommended.slug] ?? "first-attempt";

  return (
    <div className="dashboard" id="main-content">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Your next step</p>
          <h1>Welcome back.</h1>
          <p>One calm attempt today can make the real conversation feel familiar.</p>
        </div>
      </header>

      <section className="recommended-card" style={{ "--mission-color": recommended.color } as React.CSSProperties}>
        <div className="recommended-copy">
          <p className="eyebrow">Recommended mission · Yatra</p>
          <h2>{recommended.title}</h2>
          <p>{recommended.objective}</p>
          <div className="recommended-meta">
            <span><Clock3 aria-hidden="true" /> {recommended.duration}</span>
            <span><Headphones aria-hidden="true" /> Coach Mode</span>
          </div>
          <Button href={`/app/missions/${recommended.slug}`} size="large">
            Begin mission <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="recommended-visual">
          <MissionArtwork slug={recommended.slug} />
          <div className="readiness-badge">
            <span>Current readiness</span>
            <strong>{readinessLabel[recommendedReadiness]}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="recent-improvement">
          <div className="card-heading">
            <span className="icon-chip success"><Sparkles aria-hidden="true" /></span>
            <div><p className="eyebrow">Your evidence</p><h2>{progress?.valid_completions ? "Practice is being recorded." : "Your first result starts here."}</h2></div>
          </div>
          <blockquote>{progress?.valid_completions ? `${progress.valid_completions} valid mission completion${progress.valid_completions === 1 ? "" : "s"}` : "Complete a live mission to replace this empty state with real evidence."}</blockquote>
          <p>{progress?.repair_successes ?? 0} successful repair moments recorded so far.</p>
          <Link href="/app/progress">See the evidence <ChevronRight aria-hidden="true" /></Link>
        </article>

        <article className="readiness-overview">
          <div className="card-heading">
            <p className="eyebrow">Travel readiness</p>
            <strong>{progress?.valid_completions ?? 0} valid completions</strong>
          </div>
          <div className="readiness-rings">
            <div className="ring" style={{ "--progress": `${Math.min(100, (progress?.valid_completions ?? 0) * 20)}%` } as React.CSSProperties}><span>{Math.min(100, (progress?.valid_completions ?? 0) * 20)}<small>%</small></span></div>
            <div>
              <strong>Growing independence</strong>
              <p>{progress && progress.independence_delta > 0 ? `Up ${Math.round(progress.independence_delta * 100)}% across measured attempts` : "Complete two attempts to measure change"}</p>
            </div>
          </div>
          <ul>
            {missions.slice(0, 3).map((mission) => {
              const readiness = progress?.readiness_by_mission[mission.slug] ?? "first-attempt";
              return <li key={mission.slug}><i className={readiness === "ready" ? "ready" : readiness === "practicing" || readiness === "nearly-ready" ? "practice" : ""} /><span>{mission.title}</span><strong>{readinessLabel[readiness]}</strong></li>;
            })}
          </ul>
        </article>
      </section>

      <section className="mission-shortlist">
        <div className="section-heading split">
          <div><p className="eyebrow">All missions</p><h2>Choose your situation.</h2></div>
          <Button href="/app/missions" variant="ghost">View all <ChevronRight aria-hidden="true" /></Button>
        </div>
        <div className="shortlist-grid">
          {missions.slice(1, 4).map((mission) => (
            <Link href={`/app/missions/${mission.slug}`} key={mission.slug}>
              <span className="mission-dot" style={{ background: mission.color }} />
              <span><strong>{mission.title}</strong><small>{mission.eyebrow}</small></span>
              <Check aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
