// DM reminders — daily per-platform DM + follow-up targets.
//
// Targets come from lib/sales-limits.ts (TARGET_PCT = 75% of the safe daily max).
// Counts come from kpis.connectionsSent (status="1st message" today) and
// kpis.followUpsSent (any follow-up stage moved today). Both are derived from
// Notion CRM status changes.

import { AlertCircle, CheckCircle2, Gauge, Send } from "lucide-react";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import {
  PLATFORM_LIMITS,
  target,
  perHour,
  paceStatus,
  PLATFORMS_ORDER,
  type PlatformKey,
  type PaceStatus,
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

export function DmReminders({ kpis }: { kpis: DerivedKpis }) {
  const now = new Date();

  // Platforms that have a DM target (everything in PLATFORM_LIMITS).
  const platforms: PlatformKey[] = PLATFORMS_ORDER.filter(
    (p) => (PLATFORM_LIMITS[p].actions as any).dm?.max
  );

  const rows = platforms.map((p) => {
    const dmCount = (kpis.connectionsSent.byPlatform as any)[p] ?? 0;
    const fuCount = (kpis.followUpsSent.byPlatform as any)[p] ?? 0;
    const total = dmCount + fuCount;
    const dmTgt = target(p, "dm");
    const fuTgt = target(p, "follow_up");
    const tgt = dmTgt + fuTgt;
    const pct = tgt > 0 ? Math.round((total / tgt) * 100) : 0;
    const hourly = perHour(p, "dm") + perHour(p, "follow_up");
    const pace = paceStatus(total, p, "dm", now); // pace against DM hourly budget
    return {
      platform: p,
      label: PLATFORM_LIMITS[p].label,
      dmCount,
      fuCount,
      total,
      dmTgt,
      fuTgt,
      tgt,
      pct,
      hourly,
      pace,
    };
  }).filter((r) => r.tgt > 0);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandTarget = rows.reduce((s, r) => s + r.tgt, 0);
  const behind = grandTarget - grandTotal;
  const onTrack = grandTotal >= grandTarget;

  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-white p-5 shadow-elevation-1">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          {onTrack ? (
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
        {!onTrack && behind > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/60 rounded-md px-2.5 py-1.5">
            <AlertCircle className="size-3.5" />
            {behind} more DM{behind === 1 ? "" : "s"} or follow-up{behind === 1 ? "" : "s"} to hit today's target
          </div>
        )}
        {onTrack && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/60 rounded-md px-2.5 py-1.5">
            <CheckCircle2 className="size-3.5" />
            On track — daily target hit
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {rows.map((r) => {
          const tone = r.pct >= 100 ? "emerald" : r.pct >= 60 ? "amber" : "stone";
          const barColor = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-stone-400";
          return (
            <div key={r.platform}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-700 font-medium truncate">{r.label}</span>
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium ${PACE_CHIP[r.pace]}`}>
                  <Gauge className="size-2.5" /> {PACE_LABEL[r.pace]}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="tabular-nums text-stone-500">
                  {r.total} / {r.tgt}
                </span>
                <span className="tabular-nums text-stone-500">~{r.hourly}/hr</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`${barColor} h-full transition-all duration-300`}
                  style={{ width: `${Math.min(100, r.pct)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-stone-400 tabular-nums">
                {r.dmCount}/{r.dmTgt} new · {r.fuCount}/{r.fuTgt} follow-ups
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-stone-500">
        Counts come from Notion CRM <strong>Status</strong> transitions:{" "}
        moving a contact to <code className="px-1 bg-stone-100 rounded">1st message</code> = new DM,{" "}
        moving to any Follow-up stage = follow-up DM.
      </div>
    </section>
  );
}
