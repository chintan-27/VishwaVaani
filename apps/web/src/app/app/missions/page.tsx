import { MissionCard } from "@/components/mission-card";
import { missions } from "@/lib/missions";

export const metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <div className="inside-page" id="main-content">
      <header className="inside-header">
        <p className="eyebrow">Yatra · Scenario practice</p>
        <h1>Choose the moment you want to master.</h1>
        <p>
          Every mission teaches the language of the situation—and how to recover when the
          conversation changes.
        </p>
      </header>
      <div className="mission-grid app-missions">
        {missions.map((mission, index) => (
          <MissionCard key={mission.slug} mission={mission} priority={index === 0} />
        ))}
      </div>
    </div>
  );
}
