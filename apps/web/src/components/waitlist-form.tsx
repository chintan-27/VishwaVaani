"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";

export function WaitlistForm() {
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("submitting");
    window.setTimeout(() => setState("done"), 750);
  };

  if (state === "done") {
    return (
      <div className="form-success" role="status">
        <span className="success-icon">
          <Check aria-hidden="true" />
        </span>
        <p className="eyebrow">You’re on the list</p>
        <h2>We’ll send an invite when your cohort opens.</h2>
        <p>
          Beta access is free. We will never ask for payment details or send practice recordings by
          email.
        </p>
        <Button href="/preview" variant="secondary">
          Try the voice preview
        </Button>
      </div>
    );
  }

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="name">First name</label>
        <input id="name" name="name" autoComplete="given-name" required placeholder="Aarav" />
      </div>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <fieldset>
        <legend>What are you preparing for?</legend>
        <div className="choice-row">
          {["Travel", "Study", "Work", "Confidence"].map((choice) => (
            <label className="chip-choice" key={choice}>
              <input name="goal" type="radio" value={choice.toLowerCase()} required />
              <span>{choice}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="check-row">
        <input type="checkbox" required />
        <span>
          I am 18 or older and agree to receive beta access emails. I can unsubscribe at any time.
        </span>
      </label>
      <div className="turnstile-placeholder" aria-label="Abuse protection placeholder">
        Protected by Turnstile when configured
      </div>
      <Button size="large" type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? (
          <>
            <LoaderCircle className="spin" aria-hidden="true" /> Joining…
          </>
        ) : (
          "Request beta access"
        )}
      </Button>
      <small>
        We collect only what we need to manage invitations. Waitlist data is not used to train AI.
      </small>
    </form>
  );
}
