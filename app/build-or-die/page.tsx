// Build or Die — weekly delivery leaderboard. Manual logging only for now;
// auto-tracking from projects/deliverables will be added later.

import { Trophy, Hammer } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/server";
import { getBuildLeaderboard } from "@/lib/db/build-leaderboard";
import { addWeeks, fmtWeekLabel, weekStartFor } from "@/lib/marketing/points";
import { LeaderboardView } from "@/components/leaderboards/leaderboard-view";
import { LogBuildActivityButton } from "@/components/builds/log-activity-button";

export const dynamic = "force-dynamic";

export default async function BuildOrDiePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const thisWeek = weekStartFor();
  const ws = params.week || thisWeek;
  const { weekStart, rows } = await getBuildLeaderboard(ws);

  const canSetTarget = me?.role === "owner" || me?.role === "admin";
  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart === thisWeek;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Hammer className="size-6 text-blue-600" />
            <h1 className="text-2xl font-semibold text-stone-900">Build or Die</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold uppercase tracking-wide">
              <Trophy className="size-3" /> Leaderboard
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Ship features, close bugs, deliver projects. If nothing shipped, the streak dies.
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Manual for now — auto-tracking from project deliverables will be added later.
          </p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          <LogBuildActivityButton weekStart={weekStart} />
        </div>
      </div>

      <LeaderboardView
        rows={rows}
        weekStart={weekStart}
        weekLabel={fmtWeekLabel(weekStart)}
        isCurrentWeek={isCurrentWeek}
        prevWeekHref={`/build-or-die?week=${prevWeek}`}
        nextWeekHref={`/build-or-die?week=${nextWeek}`}
        currentWeekHref="/build-or-die"
        meId={me?.id ?? null}
        canSetTarget={canSetTarget}
        setTargetApiPath="/api/build/target"
        emptyMessage="No builds yet. Log a feature delivery, integration, or deploy to get started."
      />
    </div>
  );
}
