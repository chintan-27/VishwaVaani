"use client";

import { Compass, House, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Home", secondary: "Samvaad", icon: House },
  { href: "/app/missions", label: "Missions", secondary: "Yatra", icon: Compass },
  { href: "/app/progress", label: "Progress", secondary: "Pragati", icon: TrendingUp },
  { href: "/app/settings", label: "Settings", secondary: "Preferences", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Application navigation">
          {items.map((item) => {
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link className={cn("nav-item", active && "active")} href={item.href} key={item.href}>
                <Icon aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.secondary}</small>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="beta-pass">
          <span>Closed beta</span>
          <strong>4 sessions left today</strong>
          <div aria-label="Four out of five sessions available">
            <i />
            <i />
            <i />
            <i />
            <i className="used" />
          </div>
          <small>Daily limit resets at midnight</small>
        </div>
      </aside>
      <main className="app-content">{children}</main>
      <nav className="bottom-nav" aria-label="Mobile application navigation">
        {items.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link className={cn(active && "active")} href={item.href} key={item.href}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
