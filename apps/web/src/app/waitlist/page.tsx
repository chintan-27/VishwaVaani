import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata = { title: "Join the closed beta" };

export default function WaitlistPage() {
  return (
    <main className="auth-page" id="main-content">
      <header className="simple-header">
        <Logo />
        <Link href="/">
          <ArrowLeft aria-hidden="true" /> Back to home
        </Link>
      </header>
      <div className="auth-grid">
        <section className="auth-intro">
          <p className="eyebrow">Free closed beta · Adults 18+</p>
          <h1>Make your next journey feel familiar.</h1>
          <p>
            Join a small cohort helping us make voice practice fair, useful, and genuinely ready
            for Indian learners.
          </p>
          <ul>
            <li><Check aria-hidden="true" /> All five travel missions</li>
            <li><Check aria-hidden="true" /> Coach and Real-World modes</li>
            <li><Check aria-hidden="true" /> Hints in five Indian languages</li>
            <li><Check aria-hidden="true" /> No payments during beta</li>
          </ul>
        </section>
        <section className="auth-card" aria-label="Beta waitlist form">
          <p className="eyebrow">Request an invitation</p>
          <h2>Tell us where you’re headed.</h2>
          <WaitlistForm />
        </section>
      </div>
    </main>
  );
}
