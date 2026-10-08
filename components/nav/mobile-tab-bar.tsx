"use client";

// Bottom tab bar for the 5 primary routes on mobile. Always visible below md.
// Pairs with MobileNav (hamburger → drawer) which covers all other routes
// (Top 50, Stuck, Cadences, Meetings, Networking, Settings, etc).
//
// UX:
//   - 5 equal-width slots = each slot is ~20vw on the smallest phone
//   - Each tap target ≥ 56px tall (well above the 44px guideline)
//   - Active tab gets accent color + filled-icon feel
//   - Fixed to viewport bottom with safe-area-inset-bottom padding so the
//     iOS home indicator doesn't sit on top of the tabs

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UserPlus, Flame, MessageSquare, AlertTriangle, GitBranch, UsersRound, type LucideIcon } from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

// The five most-used routes per Saidur's user preference (CRM/Connect/Engage/DM
// are the daily outreach pillars; Dashboard is the morning glance).
const TABS: Tab[] = [
  { href: "/",           label: "Home",    icon: Home },
  { href: "/contacts",   label: "CRM",     icon: Users },
  { href: "/connect",    label: "Connect", icon: UserPlus },
  { href: "/engagement", label: "Engage",  icon: Flame },
  { href: "/dm",         label: "DM",      icon: MessageSquare },
];

// Reporting tabs that fill the slots of any hidden (feature-flagged) tabs.
const FALLBACK_TABS: Tab[] = [
  { href: "/funnel",      label: "Funnel", icon: GitBranch },
  { href: "/seats",       label: "Seats",  icon: UsersRound },
  { href: "/stuck",       label: "Stuck",  icon: AlertTriangle },
];

export function MobileTabBar({ hiddenHrefs = [] }: { hiddenHrefs?: string[] }) {
  const pathname = usePathname();
  const visible = TABS.filter((t) => !hiddenHrefs.includes(t.href));
  const tabs = [...visible, ...FALLBACK_TABS].slice(0, TABS.length);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 transition-colors ${
                active
                  ? "text-stone-900"
                  : "text-stone-500 active:text-stone-900 active:bg-stone-100"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              <t.icon
                className={`size-5 ${active ? "stroke-[2.2px]" : ""}`}
                aria-hidden="true"
              />
              <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                {t.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-stone-900" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
