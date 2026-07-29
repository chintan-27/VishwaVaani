import { ArrowUpRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { MissionArtwork } from "@/components/mission-artwork";
import type { Mission } from "@/lib/types";

export function MissionCard({ mission, priority = false }: { mission: Mission; priority?: boolean }) {
  return (
    <Link
      className={priority ? "mission-card priority" : "mission-card"}
      href={`/app/missions/${mission.slug}`}
      style={{ "--mission-color": mission.color } as React.CSSProperties}
    >
      <div className="mission-card-visual">
        <MissionArtwork slug={mission.slug} compact />
        <span className="mission-number" aria-hidden="true">
          {mission.number}
        </span>
      </div>
      <div className="mission-card-body">
        <div>
          <p className="eyebrow">{mission.eyebrow}</p>
          <h3>{mission.title}</h3>
        </div>
        <ArrowUpRight aria-hidden="true" />
        <p>{mission.description}</p>
        <div className="mission-meta">
          <span>
            <Clock3 aria-hidden="true" /> {mission.duration}
          </span>
          <span>{mission.difficulty}</span>
        </div>
      </div>
    </Link>
  );
}
