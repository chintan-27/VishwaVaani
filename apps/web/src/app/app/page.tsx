import { ArrowRight, Check, ChevronRight, Clock3, Headphones, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/button";
import { MissionArtwork } from "@/components/mission-artwork";
import { missions } from "@/lib/missions";

export const metadata = { title: "Home" };

export default function AppHomePage() {
  const recommended = missions[0];

  return (
    <div className="dashboard" id="main-content">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Wednesday · Your next step</p>
          <h1>Good morning, Ananya.</h1>
          <p>One calm attempt today can make the real conversation feel familiar.</p>
        </div>
        <div className="profile-chip" aria-label="Demo learner profile">
          <span>AR</span>
          <div><strong>Ananya Rao</strong><small>Growing · A2</small></div>
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
            <strong>First attempt</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="recent-improvement">
          <div className="card-heading">
            <span className="icon-chip success"><Sparkles aria-hidden="true" /></span>
            <div><p className="eyebrow">Recent improvement</p><h2>You recovered clearly.</h2></div>
          </div>
          <blockquote>“Could you repeat the room number, please?”</blockquote>
          <p>You used a repair phrase without a hint in your last hotel attempt.</p>
          <Link href="/app/progress">See the evidence <ChevronRight aria-hidden="true" /></Link>
        </article>

        <article className="readiness-overview">
          <div className="card-heading">
            <p className="eyebrow">Travel readiness</p>
            <strong>2 of 5 in progress</strong>
          </div>
          <div className="readiness-rings">
            <div className="ring" style={{ "--progress": "62%" } as React.CSSProperties}><span>62<small>%</small></span></div>
            <div>
              <strong>Growing independence</strong>
              <p>Fewer hints across familiar situations</p>
            </div>
          </div>
          <ul>
            <li><i className="ready" /><span>Hotel check-in</span><strong>Nearly ready</strong></li>
            <li><i className="practice" /><span>Restaurant</span><strong>Practicing</strong></li>
            <li><i /><span>Immigration</span><strong>Not started</strong></li>
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
