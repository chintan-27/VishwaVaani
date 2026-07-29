import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/button";
import { getMission, missions } from "@/lib/missions";

export default async function ResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mission = getMission(slug);
  if (!mission) notFound();
  const index = missions.findIndex((candidate) => candidate.slug === mission.slug);
  const nextMission = missions[(index + 1) % missions.length];

  return (
    <div className="results-page" id="main-content">
      <header className="result-hero">
        <div className="result-orbit" aria-hidden="true"><span /><span /><span /></div>
        <p className="eyebrow">Mission complete · {mission.title}</p>
        <div className="readiness-label">Practicing</div>
        <h1>You completed the exchange.</h1>
        <p>Your meaning was clear. One shorter answer will make the next attempt feel steadier.</p>
        <div className="result-summary">
          <span><Clock3 aria-hidden="true" /><strong>4:38</strong><small>Conversation</small></span>
          <span><Target aria-hidden="true" /><strong>4 / 4</strong><small>Details covered</small></span>
          <span><Lightbulb aria-hidden="true" /><strong>2</strong><small>Hints used</small></span>
        </div>
      </header>

      <div className="result-content">
        <section className="outcome-card">
          <div className="card-heading">
            <span className="icon-chip success"><Check aria-hidden="true" /></span>
            <div><p className="eyebrow">What worked</p><h2>The practical outcome was successful.</h2></div>
          </div>
          <div className="slot-grid">
            {mission.requiredSlots.map((slot, index) => (
              <div key={slot}><Check aria-hidden="true" /><span><strong>{slot.replaceAll("-", " ")}</strong><small>{index === 1 ? "Confirmed after one repeat" : "Shared independently"}</small></span></div>
            ))}
          </div>
        </section>

        <section className="obstacle-card">
          <p className="eyebrow">Your one main obstacle</p>
          <h2>Keep answers short when the question is direct.</h2>
          <p>
            You gave the correct stay details, then added extra information that made the date less
            clear. Lead with the answer first.
          </p>
          <blockquote>
            <span>You said</span>
            “I will be staying, actually I arrived today and then maybe around ten days…”
          </blockquote>
          <blockquote className="better">
            <span>Try this shape</span>
            “I’ll stay for ten days. I leave on 12 August.”
          </blockquote>
        </section>

        <section className="drill-card">
          <div>
            <p className="eyebrow">2-minute drill · Uccharan</p>
            <h2>Answer first, then add one detail.</h2>
            <p>Three rapid questions will help you build a calm, direct response rhythm.</p>
          </div>
          <div className="drill-visual"><Headphones aria-hidden="true" /><span>2:00</span></div>
          <Button>Start quick drill <ArrowRight aria-hidden="true" /></Button>
        </section>

        <section className="evidence-card">
          <details>
            <summary>Review transcript evidence <ChevronRight aria-hidden="true" /></summary>
            <div className="transcript-list">
              <div><span>Officer · 00:42</span><p>How long will you be staying?</p></div>
              <div className="learner"><span>You · 00:48</span><p>I will be staying… maybe around ten days. I leave on 12 August.</p></div>
              <div><span>Evidence note</span><p>Duration and return date were both understood. The second clause resolved the first hesitation.</p></div>
            </div>
          </details>
        </section>

        <div className="result-actions">
          <Button href={`/app/missions/${mission.slug}`} variant="secondary"><RotateCcw aria-hidden="true" /> Retry this mission</Button>
          <Button href={`/app/missions/${nextMission.slug}`}>Next: {nextMission.title} <ArrowRight aria-hidden="true" /></Button>
        </div>
        <p className="evaluation-note"><Sparkles aria-hidden="true" /> Result combines deterministic task evidence with a structured semantic review. Low-confidence clarity evidence abstains.</p>
        <Link className="inline-link" href="/app/progress">See how this changed your progress <ChevronRight aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
