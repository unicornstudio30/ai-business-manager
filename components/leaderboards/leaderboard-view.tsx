// Shared leaderboard row + team-total render. Used by all three
// (Market or Die / Sell or Die / Build or Die) — same shape, different data.

import Link from "next/link";
import { Trophy, Crown, Flame, ChevronLeft, ChevronRight, Calendar, BarChart3, Target } from "lucide-react";
import { SetTargetButton } from "@/components/marketing/set-target-button";
import type { LeaderRow } from "@/lib/db/leaderboard-engine";

type Props = {
  rows: LeaderRow[];
  weekStart: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  prevWeekHref: string;
  nextWeekHref: string;
  currentWeekHref: string;
  meId: string | null;
  canSetTarget: boolean;
  // Which /api/*/target endpoint the SetTargetButton should POST to
  setTargetApiPath: string;
  // Builds the drill-down link per row (Market/Sell/Build each pass their own).
  // Return null to render the name as plain text (non-clickable).
  hrefForUser?: (userId: string) => string | null;
  emptyMessage?: string;
};

function levelBadge(level: 1 | 2 | 3 | 4) {
  const tone = {
    1: "bg-stone-100 text-stone-700",
    2: "bg-sky-100 text-sky-800",
    3: "bg-violet-100 text-violet-800",
    4: "bg-amber-100 text-amber-800",
  }[level];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${tone}`}>
      L{level}
    </span>
  );
}

function rankChip(rank: number) {
  if (rank === 1) {
    return (
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 border-2 border-amber-300 shadow-sm">
        <Crown className="size-4 text-amber-600" />
      </div>
    );
  }
  const tone =
    rank === 2 ? "bg-stone-200 text-stone-800 border-stone-300" :
    rank === 3 ? "bg-orange-100 text-orange-800 border-orange-200" :
    "bg-white text-stone-500 border-stone-200";
  return (
    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full border tabular-nums text-sm font-semibold ${tone}`}>
      {rank}
    </div>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function LeaderboardView({
  rows,
  weekStart,
  weekLabel,
  isCurrentWeek,
  prevWeekHref,
  nextWeekHref,
  currentWeekHref,
  meId,
  canSetTarget,
  setTargetApiPath,
  hrefForUser,
  emptyMessage,
}: Props) {
  const totalWeekPoints = rows.reduce((s, r) => s + r.weekPoints, 0);
  const hitCount = rows.filter((r) => r.hitTarget).length;
  const teamProgressPct =
    rows.length > 0
      ? Math.round(
          (rows.reduce((s, r) => s + r.weekPoints, 0) /
            Math.max(1, rows.reduce((s, r) => s + r.targetPoints, 0))) *
            100
        )
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Week nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={prevWeekHref}
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 min-h-[36px]"
        >
          <ChevronLeft className="size-3.5" /> Prev
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 min-h-[36px]">
          <Calendar className="size-3.5 text-stone-400" />
          {weekLabel}
          {isCurrentWeek && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-semibold">
              THIS WEEK
            </span>
          )}
        </div>
        {!isCurrentWeek && (
          <Link
            href={currentWeekHref}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 min-h-[36px]"
          >
            Jump to this week
          </Link>
        )}
        <Link
          href={nextWeekHref}
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 min-h-[36px]"
        >
          Next <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {/* Team summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-600 uppercase tracking-wide">Team points</span>
            <BarChart3 className="size-4 text-stone-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-900 tabular-nums">{totalWeekPoints.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-600 uppercase tracking-wide">Hit target</span>
            <Target className="size-4 text-stone-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-900 tabular-nums">
            {hitCount} <span className="text-base font-normal text-stone-400">/ {rows.length}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-600 uppercase tracking-wide">Team progress</span>
            <Flame className="size-4 text-stone-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-900 tabular-nums">{teamProgressPct}%</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-600 uppercase tracking-wide">Top streak</span>
            <Trophy className="size-4 text-stone-400" />
          </div>
          <div className="text-2xl font-semibold text-stone-900 tabular-nums">
            {Math.max(0, ...rows.map((r) => r.streakWeeks))}
            <span className="text-base font-normal text-stone-400 ml-1">wks</span>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
          {emptyMessage || "No active users yet."}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-2">
            <Trophy className="size-3.5 text-amber-600" /> Leaderboard
          </div>
          <ul className="divide-y divide-stone-100">
            {rows.map((r) => {
              const isMe = meId === r.userId;
              const pctClamped = Math.min(100, Math.max(0, r.pct));
              const barTone = r.hitTarget
                ? "bg-green-500"
                : r.pct >= 70
                ? "bg-amber-500"
                : r.pct >= 30
                ? "bg-orange-400"
                : "bg-red-400";
              return (
                <li key={r.userId} className={`px-4 py-3 ${isMe ? "bg-amber-50/40" : ""}`}>
                  <div className="flex items-center gap-3">
                    {rankChip(r.rank)}
                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold">
                      {initialsFor(r.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hrefForUser && hrefForUser(r.userId) ? (
                          <Link
                            href={hrefForUser(r.userId)!}
                            className="text-sm font-semibold text-stone-900 hover:underline truncate"
                            title="See this user's activity"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold text-stone-900 truncate">{r.name}</span>
                        )}
                        {levelBadge(r.level)}
                        {isMe && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">You</span>
                        )}
                        {r.streakWeeks > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-orange-700">
                            <Flame className="size-3" /> {r.streakWeeks}w
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 truncate">
                        {r.activityCount} {r.activityCount === 1 ? "activity" : "activities"} ·{" "}
                        {r.lifetimePoints.toLocaleString()} lifetime
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-semibold text-stone-900 tabular-nums">
                        {r.weekPoints.toLocaleString()}
                        <span className="text-stone-400 font-normal"> / {r.targetPoints.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className={`text-[11px] font-medium tabular-nums ${r.hitTarget ? "text-green-700" : "text-stone-500"}`}>
                          {r.pct}%
                        </span>
                        {canSetTarget && (
                          <SetTargetButton
                            userId={r.userId}
                            weekStart={weekStart}
                            currentTarget={r.targetPoints}
                            userName={r.name}
                            apiPath={setTargetApiPath}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div className={`h-full ${barTone} transition-all`} style={{ width: `${pctClamped}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
