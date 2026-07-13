import Link from "next/link";
import { clsx } from "clsx";
import { Swords, DollarSign, Hammer } from "lucide-react";

export type LeaderboardTab = "market" | "sell" | "build";

const TABS: { key: LeaderboardTab; label: string; icon: any; tone: string }[] = [
  { key: "market", label: "Market or Die", icon: Swords,     tone: "text-amber-700 border-amber-500" },
  { key: "sell",   label: "Sell or Die",   icon: DollarSign, tone: "text-emerald-700 border-emerald-500" },
  { key: "build",  label: "Build or Die",  icon: Hammer,     tone: "text-blue-700 border-blue-500" },
];

// Search-param tabs. Preserves the ?week= query so switching tabs doesn't jump
// back to the current week.
export function LeaderboardTabsNav({
  active,
  weekStart,
}: {
  active: LeaderboardTab;
  weekStart?: string;
}) {
  return (
    <div className="border-b border-stone-200 -mx-4 lg:mx-0 px-4 lg:px-0">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Leaderboards">
        {TABS.map((t) => {
          const Icon = t.icon;
          const params = new URLSearchParams();
          if (t.key !== "market") params.set("tab", t.key);
          if (weekStart) params.set("week", weekStart);
          const qs = params.toString();
          const href = `/market-or-die${qs ? `?${qs}` : ""}`;
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 min-h-[44px] whitespace-nowrap transition-colors",
                isActive
                  ? `${t.tone} bg-stone-50`
                  : "text-stone-500 border-transparent hover:text-stone-900"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
