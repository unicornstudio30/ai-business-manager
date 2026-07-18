// Market or Die — weekly marketing leaderboard. Auto-fed from the content
// calendar (publishes/reuses per platform), sent networking DMs, and CRM
// comment_drafted activities. Manual log for videos, blogs, lead magnets, etc.

import { Trophy, Swords } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/server";
import { getLeaderboard } from "@/lib/db/marketing";
import { addWeeks, fmtWeekLabel, weekStartFor } from "@/lib/marketing/points";
import { LeaderboardView } from "@/components/leaderboards/leaderboard-view";
import { LogActivityButton } from "@/components/marketing/log-activity-button";
import { AutoSyncButton } from "@/components/marketing/auto-sync-button";

export const dynamic = "force-dynamic";

export default async function MarketOrDiePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const thisWeek = weekStartFor();
  const ws = params.week || thisWeek;
  const { weekStart, rows } = await getLeaderboard(ws);

  const canSetTarget = me?.role === "owner" || me?.role === "admin";
  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart === thisWeek;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="size-6 text-amber-600" />
            <h1 className="text-2xl font-semibold text-stone-900">Market or Die</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold uppercase tracking-wide">
              <Trophy className="size-3" /> Leaderboard
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Ship marketing every week. Hit your target → streak grows. Miss it → streak dies.
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Auto-fed from <strong>Content Calendar</strong> publishes,{" "}
            <strong>sent networking DMs</strong>, and <strong>CRM comment drafts</strong>.
            Log videos, blogs, and lead magnets manually.
          </p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          {canSetTarget && <AutoSyncButton />}
          <LogActivityButton weekStart={weekStart} />
        </div>
      </div>

      <LeaderboardView
        rows={rows}
        weekStart={weekStart}
        weekLabel={fmtWeekLabel(weekStart)}
        isCurrentWeek={isCurrentWeek}
        prevWeekHref={`/market-or-die?week=${prevWeek}`}
        nextWeekHref={`/market-or-die?week=${nextWeek}`}
        currentWeekHref="/market-or-die"
        meId={me?.id ?? null}
        canSetTarget={canSetTarget}
        setTargetApiPath="/api/marketing/target"
        hrefForUser={(userId) => `/market-or-die/user/${userId}`}
        emptyMessage="No active users yet. Add team members in Users & roles to start the leaderboard."
      />
    </div>
  );
}
