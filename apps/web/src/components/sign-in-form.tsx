"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { apiRequest, setAccessToken } from "@/lib/api/client";

interface CodeResponse {
  status: "sent";
  dev_code?: string | null;
}

interface TokenResponse {
  access_token: string;
}

export function SignInForm() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<CodeResponse>("/auth/code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDevCode(response.dev_code ?? null);
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send a code.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<TokenResponse>("/auth/code/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      setAccessToken(response.access_token);
      router.push("/onboarding");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not verify the code.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="magic-link-state" role="status">
        <span>
          <Mail aria-hidden="true" />
        </span>
        <h2>Enter your sign-in code</h2>
        <p>We sent a six-digit code to {email}. It expires in 10 minutes.</p>
        {devCode && (
          <p className="config-note">
            Local development code: <strong>{devCode}</strong>
          </p>
        )}
        <form className="sign-in-form" onSubmit={verify}>
          <div className="field">
            <label htmlFor="sign-in-code">Six-digit code</label>
            <input
              id="sign-in-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />
          </div>
          {error && <p className="config-note" role="alert">{error}</p>}
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <button className="text-button" onClick={() => { setSent(false); setCode(""); setError(null); }}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <form className="sign-in-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="sign-in-email">Email address</label>
          <input
            id="sign-in-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {error && <p className="config-note" role="alert">{error}</p>}
        <Button size="large" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Email me a sign-in code"}
        </Button>
      </form>
      <p className="config-note">
        No password and no third-party auth account. Resend delivers the one-time code.
      </p>
    </div>
  );
}
