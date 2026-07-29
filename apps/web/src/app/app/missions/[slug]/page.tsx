import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionArtwork } from "@/components/mission-artwork";
import { MissionBriefing } from "@/components/mission-briefing";
import { getMission, missions } from "@/lib/missions";

export function generateStaticParams() {
  return missions.map((mission) => ({ slug: mission.slug }));
}

export default async function MissionBriefingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mission = getMission(slug);
  if (!mission) notFound();

  return (
    <div className="briefing-page" id="main-content">
      <header className="briefing-hero">
        <Link href="/app/missions"><ChevronLeft aria-hidden="true" /> All missions</Link>
        <div className="briefing-title">
          <div>
            <p className="eyebrow">{mission.eyebrow}</p>
            <h1>{mission.title}</h1>
            <p>{mission.description}</p>
          </div>
          <span className="mission-number">{mission.number}</span>
        </div>
        <MissionArtwork slug={mission.slug} />
      </header>
      <MissionBriefing mission={mission} />
    </div>
  );
}
