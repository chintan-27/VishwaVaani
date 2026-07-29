import { SettingsPanel } from "@/components/settings-panel";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="inside-page settings-page" id="main-content">
      <header className="inside-header">
        <p className="eyebrow">Preferences and privacy</p>
        <h1>Settings</h1>
        <p>Control your practice experience, accessibility, consent, and account data.</p>
      </header>
      <SettingsPanel />
    </div>
  );
}
