// Sell or Die — weekly sales leaderboard. Auto-fed from Notion CRM outreach
// activity (dm_sent, follow_up_sent, email_drafted) via the same auto-sync as
// Market or Die. Manual log for discovery calls, demos, proposals, closes.

import { Trophy, DollarSign } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/server";
import { getSalesLeaderboard } from "@/lib/db/sales-leaderboard";
import { computeLeaderboardTrend } from "@/lib/db/leaderboard-engine";
import { schema } from "@/lib/db/client";
import { addWeeks, fmtWeekLabel, weekStartFor } from "@/lib/marketing/points";
import { LeaderboardView } from "@/components/leaderboards/leaderboard-view";
import { LeaderboardTrend } from "@/components/leaderboards/leaderboard-trend";
import { SeatFilter } from "@/components/seat-filter";
import { getStages } from "@/lib/notion/stage-source";
import { filterLeaderboardBySeat, getSeat, listSeats } from "@/lib/db/seats";
import { LogSalesActivityButton } from "@/components/sales/log-activity-button";
import { AutoSyncButton } from "@/components/marketing/auto-sync-button";

export const dynamic = "force-dynamic";

export default async function SellOrDiePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; seat?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const thisWeek = weekStartFor();
  const ws = params.week || thisWeek;
  // Per-seat view: ?seat=<Notion Person>. Leaderboards are keyed by app user,
  // so the seat is mapped to its user (lib/db/seats.ts).
  const [seats, seat] = await Promise.all([listSeats(), getSeat(params.seat)]);
  const seatUserIds = seat ? (seat.user ? [seat.user.id] : []) : undefined;
  const [board, trend] = await Promise.all([
    getSalesLeaderboard(ws),
    computeLeaderboardTrend({ activityTable: schema.salesActivities as any, days: 14, userIds: seatUserIds }),
  ]);
  const { weekStart, rows } = filterLeaderboardBySeat(board, seat);
  const stages = await getStages();
  const seatQs = seat ? `&seat=${encodeURIComponent(seat.name)}` : "";

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
            lead's owner (Lead → discovery, Proposal Sent → proposal, Close → won,
            etc.), plus logged outreach (DMs / follow-ups / emails). Log manual
            calls / demos / negotiations from here too.
          </p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          {canSetTarget && <AutoSyncButton />}
          <LogSalesActivityButton weekStart={weekStart} stages={stages} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">

        <div className="text-xs text-stone-500">

          {seat

            ? seat.user

              ? `Showing seat ${seat.name} → ${seat.user.name}`

              : `Seat ${seat.name} has no matching app user — map it in Users & roles to see its leaderboard.`

            : "Showing all seats"}

        </div>

        <SeatFilter

          seats={seats.map((x) => ({ name: x.name, contactCount: x.contactCount, mapped: !!x.user }))}

          current={seat?.name ?? null}

        />

      </div>


      <LeaderboardTrend data={trend} tone="emerald" title="Team sales points — last 14 days" />

      <LeaderboardView
        rows={rows}
        weekStart={weekStart}
        weekLabel={fmtWeekLabel(weekStart)}
        isCurrentWeek={isCurrentWeek}
        prevWeekHref={`/sell-or-die?week=${prevWeek}${seatQs}`}
        nextWeekHref={`/sell-or-die?week=${nextWeek}${seatQs}`}
        currentWeekHref={seat ? `/sell-or-die?seat=${encodeURIComponent(seat.name)}` : "/sell-or-die"}
        meId={me?.id ?? null}
        canSetTarget={canSetTarget}
        setTargetApiPath="/api/sales/target"
        hrefForUser={(userId) => `/sell-or-die/user/${userId}`}
        emptyMessage="No sales activity yet. Log a DM, discovery call, or close — or hit Auto-sync to pull recent CRM outreach."
      />
    </div>
  );
}
