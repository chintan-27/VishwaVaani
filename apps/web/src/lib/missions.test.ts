import { describe, expect, it } from "vitest";

import { hintLocales, missionSlugs } from "@/lib/types";
import { missions, repairPhrases } from "@/lib/missions";

describe("mission content", () => {
  it("contains every locked mission exactly once", () => {
    expect(missions.map((mission) => mission.slug)).toEqual([...missionSlugs]);
  });

  it("provides three native-script preparation hints in every supported locale", () => {
    for (const mission of missions) {
      expect(mission.preparation).toHaveLength(3);
      expect(mission.requiredSlots).toHaveLength(4);
      for (const phrase of mission.preparation) {
        for (const locale of hintLocales) {
          expect(phrase.hints[locale].trim().length).toBeGreaterThan(4);
        }
      }
    }
  });

  it("localizes all repair controls", () => {
    for (const phrase of Object.values(repairPhrases)) {
      expect(Object.keys(phrase.hints).sort()).toEqual([...hintLocales].sort());
    }
  });
});
