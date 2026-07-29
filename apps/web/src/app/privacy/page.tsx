import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="legal-page" id="main-content">
      <header className="simple-header">
        <Logo />
        <Link href="/">
          <ArrowLeft aria-hidden="true" /> Back to home
        </Link>
      </header>
      <article>
        <p className="eyebrow">Plain-language beta summary</p>
        <h1>Your practice belongs to you.</h1>
        <p className="legal-intro">
          This product copy describes the intended beta controls and is not a substitute for the
          counsel-reviewed privacy notice required before live processing is enabled.
        </p>
        <h2>What the guest preview does</h2>
        <p>
          The public preview is scripted. It makes no AI model call, creates no account, and stores
          nothing. If you enable the optional microphone visualizer, the browser processes the
          signal locally and stops it when you leave.
        </p>
        <h2>What a live mission needs</h2>
        <p>
          A live mission processes speech in real time and incrementally stores a text transcript,
          mission events, assistance use, timings, and your result. VishwaVaani v1 does not retain
          raw voice audio. Core processing consent is separate from optional research and
          model-improvement choices.
        </p>
        <h2>How long data is kept</h2>
        <ul>
          <li>Account learning data: until deletion or 12 months of inactivity.</li>
          <li>Identifiable product analytics: 90 days.</li>
          <li>Content-minimized security logs: 180 days.</li>
          <li>Prepared export files: 24 hours.</li>
        </ul>
        <h2>Your controls</h2>
        <p>
          Settings provides export and deletion requests. Deletion revokes access immediately,
          removes active-system and processor data within seven days, and expires backups within
          35 days.
        </p>
        <p className="legal-callout">
          Before beta launch, counsel must review the final notice, consent records, processor
          terms, India Digital Personal Data Protection requirements, and CERT-In obligations.
        </p>
      </article>
    </main>
  );
}
