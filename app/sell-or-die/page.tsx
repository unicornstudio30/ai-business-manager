// Sell or Die — weekly sales leaderboard. Auto-fed from Notion CRM outreach
// activity (dm_sent, follow_up_sent, email_drafted) via the same auto-sync as
// Market or Die. Manual log for discovery calls, demos, proposals, closes.

import { Trophy, DollarSign } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/server";
import { getSalesLeaderboard } from "@/lib/db/sales-leaderboard";
import { addWeeks, fmtWeekLabel, weekStartFor } from "@/lib/marketing/points";
import { LeaderboardView } from "@/components/leaderboards/leaderboard-view";
import { LogSalesActivityButton } from "@/components/sales/log-activity-button";
import { AutoSyncButton } from "@/components/marketing/auto-sync-button";

export const dynamic = "force-dynamic";

export default async function SellOrDiePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const thisWeek = weekStartFor();
  const ws = params.week || thisWeek;
  const { weekStart, rows } = await getSalesLeaderboard(ws);

  const canSetTarget = me?.role === "owner" || me?.role === "admin";
  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart === thisWeek;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="size-6 text-emerald-600" />
            <h1 className="text-2xl font-semibold text-stone-900">Sell or Die</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold uppercase tracking-wide">
              <Trophy className="size-3" /> Leaderboard
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Every DM, call, demo, and close counts. Move deals or the streak dies.
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Auto-fed from <strong>Notion CRM</strong>: every Status flip credits the
            lead's owner (Lead → discovery, Proposal Sent → proposal, Partnership → won,
            etc.), plus logged outreach (DMs / follow-ups / emails). Log manual
            calls / demos / negotiations from here too.
          </p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          {canSetTarget && <AutoSyncButton />}
          <LogSalesActivityButton weekStart={weekStart} />
        </div>
      </div>

      <LeaderboardView
        rows={rows}
        weekStart={weekStart}
        weekLabel={fmtWeekLabel(weekStart)}
        isCurrentWeek={isCurrentWeek}
        prevWeekHref={`/sell-or-die?week=${prevWeek}`}
        nextWeekHref={`/sell-or-die?week=${nextWeek}`}
        currentWeekHref="/sell-or-die"
        meId={me?.id ?? null}
        canSetTarget={canSetTarget}
        setTargetApiPath="/api/sales/target"
        emptyMessage="No sales activity yet. Log a DM, discovery call, or close — or hit Auto-sync to pull recent CRM outreach."
      />
    </div>
  );
}
