// Team leaderboards hub — three gamified accountability boards under one route:
//   ?tab=market  → Market or Die (marketing output)   [default]
//   ?tab=sell    → Sell or Die   (sales output)
//   ?tab=build   → Build or Die  (delivery output)

import { Trophy, Swords, DollarSign, Hammer } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/server";
import { getLeaderboard } from "@/lib/db/marketing";
import { getSalesLeaderboard } from "@/lib/db/sales-leaderboard";
import { getBuildLeaderboard } from "@/lib/db/build-leaderboard";
import { addWeeks, fmtWeekLabel, weekStartFor } from "@/lib/marketing/points";

import { LeaderboardTabsNav, type LeaderboardTab } from "@/components/leaderboards/tabs";
import { LeaderboardView } from "@/components/leaderboards/leaderboard-view";
import { LogActivityButton } from "@/components/marketing/log-activity-button";
import { AutoSyncButton } from "@/components/marketing/auto-sync-button";
import { LogSalesActivityButton } from "@/components/sales/log-activity-button";
import { LogBuildActivityButton } from "@/components/builds/log-activity-button";

export const dynamic = "force-dynamic";

const VALID_TABS = new Set<LeaderboardTab>(["market", "sell", "build"]);

const META = {
  market: {
    title: "Market or Die",
    tone: "amber",
    subtitle: "Ship marketing every week. Hit your target → streak grows. Miss it → streak dies.",
    footer:
      "Auto-fed from Content Calendar publishes, sent networking DMs, and CRM comments. Log videos, blogs, and lead magnets manually.",
    Icon: Swords,
  },
  sell: {
    title: "Sell or Die",
    tone: "emerald",
    subtitle: "Every DM, call, demo, and close counts. Move deals or the streak dies.",
    footer:
      "Auto-fed from CRM outreach activity (DMs, follow-ups, emails). Log discovery calls, demos, proposals, and closes manually.",
    Icon: DollarSign,
  },
  build: {
    title: "Build or Die",
    tone: "blue",
    subtitle: "Ship features, close bugs, deliver projects. If nothing shipped, the streak dies.",
    footer:
      "Everything is manual for now — log feature deliveries, integrations, deploys, client handoffs, and audits as you ship them.",
    Icon: Hammer,
  },
} satisfies Record<LeaderboardTab, { title: string; tone: string; subtitle: string; footer: string; Icon: any }>;

const TONE_CHIP: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  blue: "bg-blue-100 text-blue-800",
};

// Full class strings for header icon (Tailwind can't parse dynamic bg-${tone}-*).
const TONE_ICON: Record<string, string> = {
  amber: "text-amber-600",
  emerald: "text-emerald-600",
  blue: "text-blue-600",
};

async function loadTab(tab: LeaderboardTab, weekStart: string) {
  if (tab === "market") return getLeaderboard(weekStart);
  if (tab === "sell") return getSalesLeaderboard(weekStart);
  return getBuildLeaderboard(weekStart);
}

function apiPathForTarget(tab: LeaderboardTab): string {
  if (tab === "market") return "/api/marketing/target";
  if (tab === "sell") return "/api/sales/target";
  return "/api/build/target";
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const tabRaw = (params.tab || "market") as LeaderboardTab;
  const tab: LeaderboardTab = VALID_TABS.has(tabRaw) ? tabRaw : "market";
  const thisWeek = weekStartFor();
  const ws = params.week || thisWeek;
  const { weekStart, rows } = await loadTab(tab, ws);

  const meta = META[tab];
  const isCurrentWeek = weekStart === thisWeek;
  const canSetTarget = me?.role === "owner" || me?.role === "admin";

  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const qs = (w?: string) => {
    const p = new URLSearchParams();
    if (tab !== "market") p.set("tab", tab);
    if (w) p.set("week", w);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <meta.Icon className={`size-6 ${TONE_ICON[meta.tone]}`} />
            <h1 className="text-2xl font-semibold text-stone-900">{meta.title}</h1>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${TONE_CHIP[meta.tone]}`}
            >
              <Trophy className="size-3" /> Leaderboard
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">{meta.subtitle}</p>
          <p className="text-xs text-stone-400 mt-1">{meta.footer}</p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          {tab === "market" && canSetTarget && <AutoSyncButton />}
          {tab === "market" && <LogActivityButton weekStart={weekStart} />}
          {tab === "sell" && <LogSalesActivityButton weekStart={weekStart} />}
          {tab === "build" && <LogBuildActivityButton weekStart={weekStart} />}
        </div>
      </div>

      <LeaderboardTabsNav active={tab} weekStart={params.week} />

      <LeaderboardView
        rows={rows}
        weekStart={weekStart}
        weekLabel={fmtWeekLabel(weekStart)}
        isCurrentWeek={isCurrentWeek}
        prevWeekHref={`/market-or-die${qs(prevWeek)}`}
        nextWeekHref={`/market-or-die${qs(nextWeek)}`}
        currentWeekHref={`/market-or-die${qs()}`}
        meId={me?.id ?? null}
        canSetTarget={canSetTarget}
        setTargetApiPath={apiPathForTarget(tab)}
        emptyMessage={
          tab === "market"
            ? "No active users yet. Add team members in Users & roles to start the leaderboard."
            : tab === "sell"
            ? "No sales activity yet. Log a DM, discovery call, or close to get started."
            : "No builds yet. Log a feature delivery, integration, or deploy to get started."
        }
      />
    </div>
  );
}
