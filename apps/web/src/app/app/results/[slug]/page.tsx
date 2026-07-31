import { notFound } from "next/navigation";

import { SessionResult } from "@/components/session-result";
import { getMission, missions } from "@/lib/missions";

export function generateStaticParams() {
  return missions.map((mission) => ({ slug: mission.slug }));
}

export default async function ResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mission = getMission(slug);
  if (!mission) notFound();
  const index = missions.findIndex((candidate) => candidate.slug === mission.slug);
  const nextMission = missions[(index + 1) % missions.length];

  return <SessionResult mission={mission} nextMission={nextMission} />;
}
