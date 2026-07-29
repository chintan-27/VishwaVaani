import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { SignInForm } from "@/components/sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="sign-in-page" id="main-content">
      <div className="sign-in-scenery" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className="simple-header">
        <Logo />
        <Link href="/">
          <ArrowLeft aria-hidden="true" /> Back to home
        </Link>
      </header>
      <section className="sign-in-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Continue your journey.</h1>
        <p>Sign in with the account that received your VishwaVaani invitation.</p>
        <SignInForm />
        <div className="security-note">
          <ShieldCheck aria-hidden="true" />
          <span>
            VishwaVaani will never ask for your passport, booking details, or payment information.
          </span>
        </div>
      </section>
    </main>
  );
}
