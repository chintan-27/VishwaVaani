import { notFound } from "next/navigation";

import { SessionRoute } from "@/components/session-route";
import { getMission, missions } from "@/lib/missions";

export function generateStaticParams() {
  return missions.map((mission) => ({ slug: mission.slug }));
}

export default async function SessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mission = getMission(slug);
  if (!mission) notFound();

  return <SessionRoute mission={mission} />;
}
