import { notFound } from "next/navigation";

import { VoiceSession } from "@/components/voice-session";
import { getMission } from "@/lib/missions";
import type { HintLocale, SessionMode } from "@/lib/types";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string; locale?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const mission = getMission(slug);
  if (!mission) notFound();
  const mode: SessionMode = query.mode === "real_world" ? "real_world" : "coach";
  const locale = (["hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN"].includes(query.locale ?? "")
    ? query.locale
    : "hi-IN") as HintLocale;

  return <VoiceSession mission={mission} mode={mode} locale={locale} />;
}
