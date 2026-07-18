// Shared per-user drill-down: activities grouped by day / week / month.
// Rendered by /{market,sell,build}-or-die/user/[id] pages.

import Link from "next/link";
import { ArrowLeft, Trophy, Flame, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import type { DetailActivity, LeaderboardVariant, UserDetail } from "@/lib/db/leaderboard-detail";
import { weekStartFor } from "@/lib/marketing/points";
import { UserSparkline } from "./user-sparkline";

export type PeriodMode = "day" | "week" | "month";
const VALID_PERIODS: PeriodMode[] = ["day", "week", "month"];

export function parsePeriod(raw: string | undefined): PeriodMode {
  return (VALID_PERIODS as string[]).includes(raw ?? "") ? (raw as PeriodMode) : "day";
}

const VARIANT_META: Record<LeaderboardVariant, { title: string; toneChip: string; toneIcon: string; toneBar: "amber" | "emerald" | "blue"; backHref: string; secondaryLabel: string }> = {
  market: {
    title: "Market or Die",
    toneChip: "bg-amber-100 text-amber-800",
    toneIcon: "text-amber-600",
    toneBar: "amber",
    backHref: "/market-or-die",
    secondaryLabel: "Platform",
  },
  sell: {
    title: "Sell or Die",
    toneChip: "bg-emerald-100 text-emerald-800",
    toneIcon: "text-emerald-600",
    toneBar: "emerald",
    backHref: "/sell-or-die",
    secondaryLabel: "Channel",
  },
  build: {
    title: "Build or Die",
    toneChip: "bg-blue-100 text-blue-800",
    toneIcon: "text-blue-600",
    toneBar: "blue",
    backHref: "/build-or-die",
    secondaryLabel: "Stack",
  },
};

function periodKey(at: Date, period: PeriodMode): string {
  const iso = at.toISOString();
  if (period === "day") return iso.slice(0, 10);           // YYYY-MM-DD
  if (period === "month") return iso.slice(0, 7);          // YYYY-MM
  return weekStartFor(at);                                  // Monday YYYY-MM-DD
}

function periodLabel(key: string, period: PeriodMode): string {
  if (period === "day") {
    const d = new Date(key + "T00:00:00Z");
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  if (period === "month") {
    const d = new Date(key + "-01T00:00:00Z");
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  }
  const d = new Date(key + "T00:00:00Z");
  return `Week of ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function humanKind(kind: string): string {
  return kind.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// Convert a source key into a short hint chip. Manual entries → "manual".
function sourceHint(source: string | null): { label: string; tone: string } | null {
  if (!source) return { label: "manual", tone: "bg-stone-100 text-stone-600" };
  if (source.startsWith("content:")) return { label: "content", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  if (source.startsWith("networking_msg:")) return { label: "networking", tone: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  if (source.startsWith("crm_activity:")) return { label: "CRM activity", tone: "bg-blue-50 text-blue-700 border-blue-200" };
  if (source.startsWith("contact_stage:")) return { label: "stage flip", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { label: "auto", tone: "bg-stone-100 text-stone-600" };
}

export function UserDetailView({
  detail,
  period,
}: {
  detail: UserDetail;
  period: PeriodMode;
}) {
  const meta = VARIANT_META[detail.variant];

  // Group by period key, preserving descending order
  const groups = new Map<string, DetailActivity[]>();
  let periodPointsTotal = 0;
  let periodActivityTotal = 0;
  for (const a of detail.activities) {
    const key = periodKey(a.at, period);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  // Per-period rollup for the summary bar (only for the current period bucket)
  const currentKey = periodKey(new Date(), period);
  const currentBucket = groups.get(currentKey) ?? [];
  periodPointsTotal = currentBucket.reduce((s, a) => s + a.points, 0);
  periodActivityTotal = currentBucket.length;

  const periodHref = (p: PeriodMode) => `${meta.backHref}/user/${detail.user.id}?period=${p}`;
  const currentLabel = period === "day" ? "today" : period === "week" ? "this week" : "this month";

  // Chart data: newest at the right (ascending order for the sparkline)
  const sparklineData = [...sortedKeys].reverse().map((key) => {
    const items = groups.get(key)!;
    return {
      key,
      label: periodLabel(key, period).split(",")[0].replace(/^Week of /, "").slice(0, 6),
      points: items.reduce((s, a) => s + a.points, 0),
      activities: items.length,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={meta.backHref}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 mb-3"
        >
          <ArrowLeft className="size-3.5" /> Back to {meta.title}
        </Link>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 text-stone-700 text-lg font-semibold shrink-0">
            {initialsFor(detail.user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-stone-900 truncate">{detail.user.name || detail.user.email}</h1>
              {levelBadge(detail.level)}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${meta.toneChip}`}>
                <Trophy className="size-3" /> {meta.title}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {detail.user.email} · {detail.user.role} · {detail.activityCount} activities · {detail.lifetimePoints.toLocaleString()} lifetime pts
            </p>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 self-start">
        {VALID_PERIODS.map((p) => {
          const active = period === p;
          return (
            <Link
              key={p}
              href={periodHref(p)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                active ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {p}
            </Link>
          );
        })}
      </div>

      {/* Current-period rollup */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label={`Points ${currentLabel}`} value={periodPointsTotal} Icon={Sparkles} />
        <StatTile label={`Activities ${currentLabel}`} value={periodActivityTotal} Icon={CalendarIcon} />
        <StatTile label="Lifetime pts" value={detail.lifetimePoints} Icon={Trophy} />
        <StatTile label={`L${detail.level} default target / week`} value={detail.defaultTarget} Icon={Flame} />
      </div>

      {/* Sparkline of points per period bucket */}
      {sparklineData.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-medium text-stone-600 uppercase tracking-wide mb-2">
            Points per {period}
          </div>
          <UserSparkline data={sparklineData} tone={meta.toneBar} />
        </div>
      )}

      {/* Grouped activity list */}
      {detail.activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
          No activities yet.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sortedKeys.map((key) => {
            const items = groups.get(key)!;
            const pointsInGroup = items.reduce((s, a) => s + a.points, 0);
            return (
              <section key={key}>
                <div className="flex items-baseline justify-between mb-2 sticky top-0 bg-stone-50 py-1 z-10">
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {periodLabel(key, period)}
                  </div>
                  <div className="text-xs text-stone-500 tabular-nums">
                    {items.length} {items.length === 1 ? "activity" : "activities"} · <strong className="text-stone-900">{pointsInGroup}</strong> pts
                  </div>
                </div>
                <ul className="rounded-2xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
                  {items.map((a) => {
                    const hint = sourceHint(a.source);
                    return (
                      <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-14 shrink-0 text-[11px] tabular-nums text-stone-400">
                          {a.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-stone-900">{humanKind(a.kind)}</span>
                            {a.count > 1 && (
                              <span className="text-[11px] text-stone-500 tabular-nums">× {a.count}</span>
                            )}
                            <span className="inline-flex items-center rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 capitalize">
                              {a.secondary.replace(/_/g, " ")}
                            </span>
                            {hint && (
                              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${hint.tone}`}>
                                {hint.label}
                              </span>
                            )}
                          </div>
                          {a.notes && (
                            <div className="text-xs text-stone-500 truncate mt-0.5">{a.notes}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-semibold text-stone-900 tabular-nums">+{a.points}</div>
                          <div className="text-[10px] text-stone-400 uppercase">pts</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, Icon }: { label: string; value: number; Icon: any }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-600 uppercase tracking-wide truncate">{label}</span>
        <Icon className="size-4 text-stone-400 shrink-0" />
      </div>
      <div className="text-2xl font-semibold text-stone-900 tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
