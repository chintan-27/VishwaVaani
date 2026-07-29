import { Logo } from "@/components/logo";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const metadata = { title: "Set up your practice" };

export default function OnboardingPage() {
  return (
    <main className="onboarding-page" id="main-content">
      <header className="onboarding-header">
        <Logo />
        <span>Private beta setup</span>
      </header>
      <OnboardingFlow />
    </main>
  );
}
