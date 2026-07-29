import { Menu } from "lucide-react";

import { Button } from "@/components/button";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Logo />
        <nav className="public-nav" aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#missions">Missions</a>
          <a href="#principles">Our approach</a>
        </nav>
        <div className="public-actions">
          <Button href="/sign-in" variant="ghost">
            Sign in
          </Button>
          <Button href="/preview">Try a voice preview</Button>
        </div>
        <Button className="mobile-menu" variant="ghost" size="icon" aria-label="Open navigation">
          <Menu aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
