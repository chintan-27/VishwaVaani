import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AudioPreview } from "@/components/audio-preview";
import { Logo } from "@/components/logo";

export const metadata = { title: "Voice preview" };

export default function PreviewPage() {
  return (
    <main className="preview-page" id="main-content">
      <header className="simple-header">
        <Logo />
        <Link href="/">
          <ArrowLeft aria-hidden="true" /> Back to home
        </Link>
      </header>
      <AudioPreview />
      <p className="preview-footnote">
        Scripted preview · No model call · No account · No storage
      </p>
    </main>
  );
}
