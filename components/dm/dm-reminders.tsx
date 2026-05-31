// DM reminders — per-platform daily + hourly targets, split into three sub-rows:
//   - Connected DM    (Notion status "1st message" → DMs to people you're already linked to)
//   - InMail (cold)   (Notion status "Inmail"     → cold first messages, no connection)
//   - Follow-ups      (any follow-up status moved today)
//
// Each sub-row has its own daily target + hourly pacing budget so the user can
// stay safe within each platform's distinct ban thresholds for connected vs
// non-connected messaging.

import { AlertCircle, CheckCircle2, Gauge, Send } from "lucide-react";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import {
  PLATFORM_LIMITS,
  target,
  perHour,
  paceStatus,
  PLATFORMS_ORDER,
  type PlatformKey,
  type ActionKey,
  type PaceStatus,
  type EffectiveLimits,
  type ActiveWindow,
} from "@/lib/sales-limits";

const PACE_CHIP: Record<PaceStatus, string> = {
  behind: "bg-stone-100 text-stone-700",
  on_pace: "bg-emerald-100 text-emerald-800",
  over_pace: "bg-red-100 text-red-800",
};

const PACE_LABEL: Record<PaceStatus, string> = {
  behind: "Below pace",
  on_pace: "On pace",
  over_pace: "Burst risk",
};

type SubRow = {
  action: ActionKey;
  label: string;
  count: number;
  dailyTarget: number;
  hourly: number;
  pct: number;
  pace: PaceStatus;
};

type PlatformBlock = {
  platform: PlatformKey;
  label: string;
  rows: SubRow[];
  total: number;
  totalTarget: number;
  pct: number;
};

function buildSubRow(
  p: PlatformKey,
  action: ActionKey,
  count: number,
  now: Date,
  limits?: EffectiveLimits,
  window?: ActiveWindow,
): SubRow | null {
  const cfg = (limits?.[p]?.actions ?? (PLATFORM_LIMITS[p].actions as any))[action];
  if (!cfg) return null;
  const tgt = target(p, action, false, limits);
  const ph = perHour(p, action, false, limits);
  return {
    action,
    label: cfg.label,
    count,
    dailyTarget: tgt,
    hourly: ph,
    pct: tgt > 0 ? Math.round((count / tgt) * 100) : 0,
    pace: paceStatus(count, p, action, now, false, limits, window),
  };
}

export function DmReminders({
  kpis,
  limits,
  activeWindow,
}: {
  kpis: DerivedKpis;
  limits?: EffectiveLimits;
  activeWindow?: ActiveWindow;
}) {
  const now = new Date();

  const blocks: PlatformBlock[] = PLATFORMS_ORDER.map((p) => {
    const cfg = (limits?.[p]?.actions ?? (PLATFORM_LIMITS[p].actions as any)) as any;
    const rows: SubRow[] = [];

    if (cfg.dm?.max) {
      const row = buildSubRow(p, "dm", (kpis.connectionsSent.byPlatform as any)[p] ?? 0, now, limits, activeWindow);
      if (row) rows.push(row);
    }
    if (cfg.inmail?.max) {
      const row = buildSubRow(p, "inmail", (kpis.inmailsSent.byPlatform as any)[p] ?? 0, now, limits, activeWindow);
      if (row) rows.push(row);
    }
    if (cfg.follow_up?.max) {
      const row = buildSubRow(p, "follow_up", (kpis.followUpsSent.byPlatform as any)[p] ?? 0, now, limits, activeWindow);
      if (row) rows.push(row);
    }

    const total = rows.reduce((s, r) => s + r.count, 0);
    const totalTarget = rows.reduce((s, r) => s + r.dailyTarget, 0);
    return {
      platform: p,
      label: PLATFORM_LIMITS[p].label,
      rows,
      total,
      totalTarget,
      pct: totalTarget > 0 ? Math.round((total / totalTarget) * 100) : 0,
    };
  }).filter((b) => b.rows.length > 0);

  const grandTotal = blocks.reduce((s, b) => s + b.total, 0);
  const grandTarget = blocks.reduce((s, b) => s + b.totalTarget, 0);
  const behind = Math.max(0, grandTarget - grandTotal);
  const onTrack = grandTotal >= grandTarget;
  const anyOverPace = blocks.some((b) => b.rows.some((r) => r.pace === "over_pace"));

  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-white p-5 shadow-elevation-1">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          {anyOverPace ? (
            <AlertCircle className="size-5 text-red-600" />
          ) : onTrack ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <Send className="size-5 text-blue-600" />
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Today's DM target
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
          <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/60 rounded-md px-2.5 py-1.5">
            <AlertCircle className="size-3.5" />
            {behind} more DM{behind === 1 ? "" : "s"}, InMail{behind === 1 ? "" : "s"} or follow-up{behind === 1 ? "" : "s"} to hit today's target
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
        {blocks.map((b) => (
          <div key={b.platform} className="rounded-lg border border-stone-200 bg-white/70 p-3">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-stone-900 font-semibold">{b.label}</span>
              <span className="tabular-nums text-stone-500">
                {b.total} / {b.totalTarget}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {b.rows.map((r) => {
                const tone = r.pct >= 100 ? "emerald" : r.pct >= 60 ? "amber" : "stone";
                const barColor = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-stone-400";
                return (
                  <div key={r.action}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-stone-700 truncate">{r.label}</span>
                      <span className={`inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-medium ${PACE_CHIP[r.pace]}`}>
                        <Gauge className="size-2.5" /> {PACE_LABEL[r.pace]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] mb-0.5 text-stone-500">
                      <span className="tabular-nums">{r.count} / {r.dailyTarget}</span>
                      <span className="tabular-nums">~{r.hourly}/hr</span>
                    </div>
                    <div className="h-1 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-300`}
                        style={{ width: `${Math.min(100, r.pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-stone-500">
        Counts come from Notion CRM <strong>Status</strong> transitions:{" "}
        <code className="px-1 bg-stone-100 rounded">1st message</code> = DM to a connected person,{" "}
        <code className="px-1 bg-stone-100 rounded">Inmail</code> = cold first message (no connection),{" "}
        any Follow-up stage = follow-up DM.
      </div>
    </section>
  );
}
