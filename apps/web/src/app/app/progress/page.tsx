import { ArrowUpRight, Check, ChevronRight, Lightbulb, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";

import { missions } from "@/lib/missions";

export const metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <div className="inside-page progress-page" id="main-content">
      <header className="inside-header">
        <p className="eyebrow">Pragati · Evidence of independence</p>
        <h1>You are relying on less help.</h1>
        <p>Progress is measured by completed outcomes, successful recovery, and reduced assistance.</p>
      </header>

      <section className="independence-card">
        <div>
          <p className="eyebrow">Independence · Last 4 attempts</p>
          <h2>Hints down. Successful outcomes up.</h2>
          <p>You completed two missions with 38% less assistance than your first attempts.</p>
          <div className="metric-row">
            <span><strong>−38%</strong><small>Assistance used</small></span>
            <span><strong>3 / 4</strong><small>Valid completions</small></span>
            <span><strong>2</strong><small>Repairs without help</small></span>
          </div>
        </div>
        <div className="progress-chart" aria-label="Assistance use declining across four attempts">
          {[72, 60, 48, 34].map((value, index) => (
            <div key={value}><i style={{ height: `${value}%` }} /><span>A{index + 1}</span></div>
          ))}
        </div>
      </section>

      <section className="skill-map">
        <div className="section-heading split">
          <div><p className="eyebrow">Mission readiness</p><h2>What can you do independently?</h2></div>
          <span className="fairness-chip"><ShieldCheck aria-hidden="true" /> Clarity can abstain</span>
        </div>
        <div className="skill-table" role="table" aria-label="Mission readiness">
          {missions.map((mission, index) => {
            const readiness = ["First attempt", "Nearly ready", "Practicing", "Practicing", "First attempt"][index];
            const progress = [18, 78, 52, 46, 8][index];
            return (
              <Link role="row" href={`/app/missions/${mission.slug}`} key={mission.slug}>
                <span className="mission-dot" style={{ background: mission.color }} />
                <span role="cell"><strong>{mission.title}</strong><small>{mission.eyebrow}</small></span>
                <span role="cell" className="progress-line"><i style={{ width: `${progress}%` }} /></span>
                <strong role="cell">{readiness}</strong>
                <ChevronRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="growth-grid">
        <article>
          <span className="icon-chip success"><Check aria-hidden="true" /></span>
          <p className="eyebrow">Growing strength</p>
          <h2>Repair language</h2>
          <p>You now ask for repetition without waiting for a hint.</p>
          <strong>Observed in 3 missions <ArrowUpRight aria-hidden="true" /></strong>
        </article>
        <article>
          <span className="icon-chip warm"><Target aria-hidden="true" /></span>
          <p className="eyebrow">Current focus</p>
          <h2>Direct time answers</h2>
          <p>Lead with the number, then add one useful detail.</p>
          <strong>2-minute recommended drill <ArrowUpRight aria-hidden="true" /></strong>
        </article>
        <article>
          <span className="icon-chip agent"><Lightbulb aria-hidden="true" /></span>
          <p className="eyebrow">Next recommendation</p>
          <h2>Hotel · Real-World</h2>
          <p>Test your recent improvement without visible hints.</p>
          <Link href="/app/missions/hotel-check-in">View mission <ArrowUpRight aria-hidden="true" /></Link>
        </article>
      </section>
    </div>
  );
}
