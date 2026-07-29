"use client";

import { useEffect, useState } from "react";

import { VoiceSession } from "@/components/voice-session";
import type { HintLocale, Mission, SessionMode } from "@/lib/types";

const supportedLocales: HintLocale[] = ["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"];

export function SessionRoute({ mission }: { mission: Mission }) {
  const [preferences, setPreferences] = useState<{
    mode: SessionMode;
    locale: HintLocale;
  }>({ mode: "coach", locale: "hi-IN" });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const locale = query.get("locale");
    setPreferences({
      mode: query.get("mode") === "real_world" ? "real_world" : "coach",
      locale: supportedLocales.includes(locale as HintLocale)
        ? (locale as HintLocale)
        : "hi-IN",
    });
  }, []);

  return <VoiceSession mission={mission} {...preferences} />;
}
