"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";

export function SignInForm() {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="magic-link-state" role="status">
        <span>
          <Mail aria-hidden="true" />
        </span>
        <h2>Check your inbox</h2>
        <p>
          We sent a one-time sign-in link. It expires in 15 minutes and can only be used once.
        </p>
        <Button onClick={() => router.push("/onboarding")}>Continue demo onboarding</Button>
        <button className="text-button" onClick={() => setSent(false)}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <Button className="google-button" variant="secondary" onClick={() => router.push("/onboarding")}>
        <span className="google-mark" aria-hidden="true">G</span>
        Continue with Google
      </Button>
      <div className="or-divider"><span>or</span></div>
      <form className="sign-in-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="sign-in-email">Email address</label>
          <input id="sign-in-email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </div>
        <Button size="large" type="submit">
          Email me a sign-in link
        </Button>
      </form>
      <p className="config-note">
        Demo authentication is active in this build. Connect Supabase and Resend to enable real
        Google and passwordless sign-in.
      </p>
    </div>
  );
}
