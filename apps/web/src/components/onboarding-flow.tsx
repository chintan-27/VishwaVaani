"use client";

import { Check, ChevronLeft, ChevronRight, Mic, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AudioOrb } from "@/components/audio-orb";
import { Button } from "@/components/button";
import { localeLabels } from "@/lib/missions";
import type { HintLocale } from "@/lib/types";

const steps = ["Invite", "Consent", "Preferences", "Microphone"];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [locale, setLocale] = useState<HintLocale>("hi-IN");
  const [level, setLevel] = useState("new");
  const [micChecked, setMicChecked] = useState(false);

  const next = () => {
    if (step === steps.length - 1) router.push("/app");
    else setStep((current) => current + 1);
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-progress">
        {steps.map((label, index) => (
          <div className={index <= step ? "active" : ""} key={label}>
            <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <section className="onboarding-card">
        {step === 0 && (
          <div className="onboarding-step">
            <p className="eyebrow">Step 1 of 4 · Beta access</p>
            <h1>Redeem your invitation.</h1>
            <p>Invitations are tied to one account and help us keep the early beta reliable.</p>
            <div className="field">
              <label htmlFor="invite-code">Invite code</label>
              <input id="invite-code" defaultValue="VAANI-DEMO" autoCapitalize="characters" />
            </div>
            <div className="age-confirm">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Adults only in this beta</strong>
                By continuing, you confirm that you are 18 or older.
              </span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step">
            <p className="eyebrow">Step 2 of 4 · Your data</p>
            <h1>Practice with a clear privacy choice.</h1>
            <div className="consent-list">
              <label>
                <input type="checkbox" defaultChecked required />
                <span>
                  <strong>Required for live practice</strong>
                  Process my speech during a live mission and store a text transcript, assistance
                  events, and results. Raw voice audio is never retained.
                </span>
              </label>
              <label>
                <input type="checkbox" />
                <span>
                  <strong>Optional research participation</strong>
                  Allow de-identified learning data to be included in fairness audits. Off by
                  default; participation never changes access.
                </span>
              </label>
              <label>
                <input type="checkbox" />
                <span>
                  <strong>Optional model improvement</strong>
                  Allow minimized transcript excerpts to improve prompts. Off by default.
                </span>
              </label>
            </div>
            <a className="inline-link" href="/privacy">Read the plain-language privacy summary</a>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <p className="eyebrow">Step 3 of 4 · Make it yours</p>
            <h1>Choose the help that feels natural.</h1>
            <fieldset>
              <legend>Hint language</legend>
              <div className="language-grid">
                {(Object.entries(localeLabels) as [HintLocale, (typeof localeLabels)[HintLocale]][]).map(
                  ([code, label]) => (
                    <label className={locale === code ? "selected" : ""} key={code}>
                      <input
                        name="locale"
                        type="radio"
                        value={code}
                        checked={locale === code}
                        onChange={() => setLocale(code)}
                      />
                      <strong lang={code.split("-")[0]}>{label.native}</strong>
                      <small>{label.label}</small>
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend>How does spoken English feel today?</legend>
              <div className="level-grid">
                {[
                  ["new", "I need time", "I can answer simple questions with support."],
                  ["growing", "I can keep going", "I can manage familiar conversations."],
                  ["ready", "Challenge me", "I want natural speed and variation."],
                ].map(([value, title, copy]) => (
                  <label className={level === value ? "selected" : ""} key={value}>
                    <input
                      name="level"
                      type="radio"
                      value={value}
                      checked={level === value}
                      onChange={() => setLevel(value)}
                    />
                    <strong>{title}</strong>
                    <small>{copy}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step mic-step">
            <p className="eyebrow">Step 4 of 4 · Sound check</p>
            <h1>Let’s make sure we can hear you.</h1>
            <p>Say “I’m ready to begin.” The sound check is processed locally and not saved.</p>
            <AudioOrb state={micChecked ? "completed" : "ready"} level={micChecked ? 0.3 : 0.15} />
            <Button variant="secondary" onClick={() => setMicChecked(true)}>
              <Mic aria-hidden="true" /> {micChecked ? "Microphone sounds good" : "Test microphone"}
            </Button>
            {micChecked && (
              <div className="mic-success" role="status">
                <Check aria-hidden="true" /> Clear signal detected. You can change devices in
                Settings.
              </div>
            )}
          </div>
        )}

        <div className="onboarding-actions">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((current) => current - 1)}>
              <ChevronLeft aria-hidden="true" /> Back
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={next} disabled={step === 3 && !micChecked}>
            {step === steps.length - 1 ? "Enter VishwaVaani" : "Continue"}
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}
