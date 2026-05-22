// Connect reminders — daily + hourly per-platform connection-request targets.
//
// Two views per platform:
//   - DAILY: progress toward today's safe daily cap (target = 75% of platform max)
//   - HOURLY: pacing budget for ban-risk control — spread requests across the
//     active outreach window instead of burst-sending. Status: behind / on_pace
//     / over_pace.
//
// LinkedIn gets a second row for InMail (paid, cold to non-connections) since
// InMail has its own much lower cap that's independent of the connect cap.
//
// Counts:
//   - connect:  kpis.connectionsSent.byPlatform (contacts moved to "1st message" today)
//   - inmail:   kpis.inmailsSent.byPlatform     (contacts moved to "In-mail" today)

import { AlertCircle, CheckCircle2, Gauge, UserPlus } from "lucide-react";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import {
  PLATFORM_LIMITS,
  PLATFORMS_ORDER,
  target,
  maxFor,
  perHour,
  paceStatus,
  type PlatformKey,
  type ActionKey,
  type PaceStatus,
} from "@/lib/sales-limits";

type Row = {
  platform: PlatformKey;
  action: ActionKey;
  label: string;
  count: number;
  dailyTarget: number;
  dailyMax: number;
  hourly: number;
  pace: PaceStatus;
  dailyPct: number;
};

const PACE_TONE: Record<PaceStatus, { text: string; chip: string; label: string }> = {
  behind:    { text: "text-stone-600",  chip: "bg-stone-100 text-stone-700",     label: "Below pace" },
  on_pace:   { text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-800", label: "On pace" },
  over_pace: { text: "text-red-700",     chip: "bg-red-100 text-red-800",         label: "Burst risk" },
};

export function ConnectReminders({ kpis }: { kpis: DerivedKpis }) {
  const now = new Date();

  const rows: Row[] = [];
  for (const p of PLATFORMS_ORDER) {
    const cfg = PLATFORM_LIMITS[p].actions as any;
    // Connect-style action (LinkedIn "connect", Facebook "connect" = friend req,
    // IG/X "connect" = follow). Skip platforms with no connect action.
    if (cfg.connect?.max) {
      const count = (kpis.connectionsSent.byPlatform as any)[p] ?? 0;
      rows.push({
        platform: p,
        action: "connect",
        label: `${PLATFORM_LIMITS[p].label} · ${cfg.connect.label}`,
        count,
        dailyTarget: target(p, "connect"),
        dailyMax: maxFor(p, "connect"),
        hourly: perHour(p, "connect"),
        pace: paceStatus(count, p, "connect", now),
        dailyPct: target(p, "connect") > 0 ? Math.round((count / target(p, "connect")) * 100) : 0,
      });
    }
    if (cfg.inmail?.max) {
      const count = (kpis.inmailsSent.byPlatform as any)[p] ?? 0;
      rows.push({
        platform: p,
        action: "inmail",
        label: `${PLATFORM_LIMITS[p].label} · ${cfg.inmail.label}`,
        count,
        dailyTarget: target(p, "inmail"),
        dailyMax: maxFor(p, "inmail"),
        hourly: perHour(p, "inmail"),
        pace: paceStatus(count, p, "inmail", now),
        dailyPct: target(p, "inmail") > 0 ? Math.round((count / target(p, "inmail")) * 100) : 0,
      });
    }
  }

  const grandTotal = rows.reduce((s, r) => s + r.count, 0);
  const grandTarget = rows.reduce((s, r) => s + r.dailyTarget, 0);
  const behind = Math.max(0, grandTarget - grandTotal);
  const onTrack = grandTotal >= grandTarget;
  const anyOverPace = rows.some((r) => r.pace === "over_pace");

  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-elevation-1">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          {anyOverPace ? (
            <AlertCircle className="size-5 text-red-600" />
          ) : onTrack ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <UserPlus className="size-5 text-emerald-600" />
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Today's connect target
            </div>
            <div className="text-2xl font-semibold tabular-nums text-stone-900">
              {grandTotal} <span className="text-stone-400 text-base font-normal">/ {grandTarget}</span>
            </div>
          </div>
        </div>
        {anyOverPace && (
          <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-100/60 rounded-md px-2.5 py-1.5">
            <AlertCircle className="size-3.5" />
            Burst risk on one or more platforms — slow down to stay under hourly pace
          </div>
        )}
        {!anyOverPace && !onTrack && behind > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/60 rounded-md px-2.5 py-1.5">
            <AlertCircle className="size-3.5" />
            {behind} more to hit today's safe connect target
          </div>
        )}
        {!anyOverPace && onTrack && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/60 rounded-md px-2.5 py-1.5">
            <CheckCircle2 className="size-3.5" />
            On track — daily target hit
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const tone = r.dailyPct >= 100 ? "emerald" : r.dailyPct >= 60 ? "amber" : "stone";
          const barColor = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-stone-400";
          const paceMeta = PACE_TONE[r.pace];
          return (
            <div key={`${r.platform}-${r.action}`} className="rounded-lg border border-stone-200 bg-white/70 p-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-800 font-medium truncate">{r.label}</span>
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium ${paceMeta.chip}`}>
                  <Gauge className="size-2.5" /> {paceMeta.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-500 tabular-nums">
                  {r.count} / {r.dailyTarget}{" "}
                  <span className="text-stone-300">({r.dailyMax} max)</span>
                </span>
                <span className="text-stone-500 tabular-nums">~{r.hourly}/hr</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`${barColor} h-full transition-all duration-300`}
                  style={{ width: `${Math.min(100, r.dailyPct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-stone-500">
        Daily target = 75% of platform max. Hourly pace is the budget per active hour (10am–11pm)
        — staying near it spreads outreach across the day and reduces ban risk vs burst-sending.
      </div>
    </section>
  );
}
