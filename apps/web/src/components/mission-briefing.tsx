"use client";

import { Accessibility, Check, ChevronRight, Clock3, Headphones, Mic2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";
import { localeLabels } from "@/lib/missions";
import type { HintLocale, Mission, SessionMode } from "@/lib/types";

export function MissionBriefing({ mission }: { mission: Mission }) {
  const [mode, setMode] = useState<SessionMode>("coach");
  const [locale, setLocale] = useState<HintLocale>("hi-IN");
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  return (
    <div className="briefing-content">
      <section className="briefing-main">
        <p className="eyebrow">Your objective</p>
        <h1>{mission.objective}</h1>
        <div className="briefing-meta">
          <span><Clock3 aria-hidden="true" /> {mission.duration}</span>
          <span>{mission.accent}</span>
          <span>{mission.difficulty}</span>
        </div>

        <div className="preparation-block">
          <div className="block-title">
            <span>Three phrases to take with you</span>
            <select
              aria-label="Hint language"
              value={locale}
              onChange={(event) => setLocale(event.target.value as HintLocale)}
            >
              {(Object.entries(localeLabels) as [HintLocale, (typeof localeLabels)[HintLocale]][]).map(
                ([code, label]) => (
                  <option value={code} key={code}>{label.label}</option>
                ),
              )}
            </select>
          </div>
          <ol className="phrase-list">
            {mission.preparation.map((phrase, index) => (
              <li key={phrase.en}>
                <span>{index + 1}</span>
                <div>
                  <strong>{phrase.en}</strong>
                  <small lang={locale.split("-")[0]}>{phrase.hints[locale]}</small>
                </div>
                <button aria-label={`Play ${phrase.en}`}><Headphones aria-hidden="true" /></button>
              </li>
            ))}
          </ol>
          <p className="reviewed-label"><Check aria-hidden="true" /> Native-script hints reviewed for this beta content set</p>
        </div>

        <fieldset className="mode-selector">
          <legend>Choose your practice mode</legend>
          <label className={mode === "coach" ? "selected" : ""}>
            <input
              type="radio"
              name="mode"
              value="coach"
              checked={mode === "coach"}
              onChange={() => setMode("coach")}
            />
            <span className="mode-icon"><Mic2 aria-hidden="true" /></span>
            <span>
              <strong>Coach Mode <em>Recommended</em></strong>
              <small>Hold to speak · Transcript · Hints · Slower pace</small>
            </span>
            <i aria-hidden="true" />
          </label>
          <label className={mode === "real_world" ? "selected" : ""}>
            <input
              type="radio"
              name="mode"
              value="real_world"
              checked={mode === "real_world"}
              onChange={() => setMode("real_world")}
            />
            <span className="mode-icon"><Headphones aria-hidden="true" /></span>
            <span>
              <strong>Real-World Mode</strong>
              <small>Hands-free · Natural pace · No on-screen help</small>
            </span>
            <i aria-hidden="true" />
          </label>
        </fieldset>

        <Button
          href={`/app/session/${mission.slug}?mode=${mode}&locale=${locale}`}
          size="large"
          className="start-mission-button"
        >
          {isDemoMode ? "Try scripted" : "Start"}{" "}
          {mode === "coach" ? "Coach" : "Real-World"} Mode <ChevronRight aria-hidden="true" />
        </Button>
        {isDemoMode && (
          <p className="reviewed-label">
            This public product tour is scripted and processes no microphone audio. Invite-only
            live missions remain disabled.
          </p>
        )}
      </section>

      <aside className="briefing-aside">
        <div className="privacy-reminder">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">Practice safely</p>
          <h2>Use details that are not real.</h2>
          <p>
            Say a fictional passport number, booking reference, phone number, and address. The
            mission never needs your real documents.
          </p>
        </div>
        <div className="accessibility-note">
          <Accessibility aria-hidden="true" />
          <span>
            Keyboard controls and accessibility captions are available in both modes. Caption use
            is clearly marked in your result.
          </span>
        </div>
      </aside>
    </div>
  );
}
