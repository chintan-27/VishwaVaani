"use client";

import { Compass, House, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ApiError, apiRequest, clearAccessToken } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Home", secondary: "Samvaad", icon: House },
  { href: "/app/missions", label: "Missions", secondary: "Yatra", icon: Compass },
  { href: "/app/progress", label: "Progress", secondary: "Pragati", icon: TrendingUp },
  { href: "/app/settings", label: "Settings", secondary: "Preferences", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    apiRequest<{ onboarding_completed: boolean; limits: { sessions_per_day: number } }>("/bootstrap")
      .then((bootstrap) => {
        if (!bootstrap.onboarding_completed) {
          router.replace("/onboarding");
          return;
        }
        setDailyLimit(bootstrap.limits.sessions_per_day);
        setAuthorized(true);
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) clearAccessToken();
        router.replace("/sign-in");
      });
  }, [router]);

  if (!authorized) {
    return <div className="app-shell"><main className="app-content"><p>Loading your practice space…</p></main></div>;
  }

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
          <strong>{dailyLimit} live sessions per day</strong>
          <small>Your usage is enforced by the API.</small>
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
