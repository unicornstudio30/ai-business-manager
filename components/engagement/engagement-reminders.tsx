// Engagement reminders bar — shows daily targets vs actuals + nudges per platform.
// Engagement counts come from notion-derived-kpis.commentsToday (Engage Touch
// increments) per platform. Targets come from lib/sales-limits.ts.

import { AlertCircle, CheckCircle2, Gauge, Target } from "lucide-react";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import {
  PLATFORM_LIMITS,
  activeHoursElapsed,
  type PlatformKey,
  type EffectiveLimits,
  type ActiveWindow,
} from "@/lib/sales-limits";

const PLATFORM_HAS_COMMENT_TARGET: PlatformKey[] = ["linkedin", "x", "instagram", "facebook", "reddit"];

// We need a daily comment target per platform. PLATFORM_LIMITS no longer has
// 'comment' (removed earlier since Engage Touch covers it), so we use a
// simple per-platform target based on healthy outreach: 40% of the DM cap.
function commentTarget(p: PlatformKey, limits?: EffectiveLimits): number {
  const dmMax = (limits?.[p]?.actions ?? (PLATFORM_LIMITS[p].actions as any)).dm?.max ?? 30;
  return Math.floor(dmMax * 0.4);
}

// Hourly comment budget — spread across the active outreach window so
// commenting doesn't burst-spike (commenting too fast also draws flags).
function commentPerHour(p: PlatformKey, window: ActiveWindow | undefined, limits?: EffectiveLimits): number {
  const span = Math.max(1, (window?.endHour ?? 23) - (window?.startHour ?? 10));
  return Math.max(1, Math.ceil(commentTarget(p, limits) / span));
}

type CommentPace = "behind" | "on_pace" | "over_pace";
function commentPace(count: number, p: PlatformKey, now: Date, window?: ActiveWindow, limits?: EffectiveLimits): CommentPace {
  const ph = commentPerHour(p, window, limits);
  const expected = ph * activeHoursElapsed(now, window);
  if (expected === 0) return "on_pace";
  if (count < expected * 0.6) return "behind";
  if (count > expected * 1.4) return "over_pace";
  return "on_pace";
}

const PACE_CHIP: Record<CommentPace, string> = {
  behind: "bg-stone-100 text-stone-700",
  on_pace: "bg-emerald-100 text-emerald-800",
  over_pace: "bg-red-100 text-red-800",
};

const PACE_LABEL: Record<CommentPace, string> = {
  behind: "Below pace",
  on_pace: "On pace",
  over_pace: "Burst risk",
};

const CHANNEL_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  reddit: "Reddit",
  discord: "Discord",
  whatsapp: "WhatsApp",
  slack: "Slack",
  email: "Email",
};

export function EngagementReminders({
  kpis,
  limits,
  activeWindow,
}: {
  kpis: DerivedKpis;
  limits?: EffectiveLimits;
  activeWindow?: ActiveWindow;
}) {
  const now = new Date();
  const today = kpis.commentsToday.total;
  const byPlatform = kpis.commentsToday.byPlatform;

  // Compute reminders per platform
  const platformStatus = PLATFORM_HAS_COMMENT_TARGET.map((p) => {
    const count = (byPlatform as any)[p] ?? 0;
    const tgt = commentTarget(p, limits);
    const pct = tgt > 0 ? Math.round((count / tgt) * 100) : 0;
    const hourly = commentPerHour(p, activeWindow, limits);
    const pace = commentPace(count, p, now, activeWindow, limits);
    return { platform: p, label: PLATFORM_LIMITS[p].label, count, target: tgt, pct, hourly, pace };
  }).filter((p) => p.target > 0);

  const grandTarget = platformStatus.reduce((s, p) => s + p.target, 0);
  const onTrack = today >= grandTarget;
  const behind = grandTarget - today;

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-white p-5 shadow-elevation-1">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          {onTrack ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <Target className="size-5 text-violet-600" />
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Today's engagement target
            </div>
            <div className="text-2xl font-semibold tabular-nums text-stone-900">
              {today} <span className="text-stone-400 text-base font-normal">/ {grandTarget}</span>
            </div>
          </div>
        </div>
        {!onTrack && behind > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-violet-700 bg-violet-100/60 rounded-md px-2.5 py-1.5">
            <AlertCircle className="size-3.5" />
            {behind} more engagement{behind === 1 ? "" : "s"} to hit today's target
          </div>
        )}
        {onTrack && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/60 rounded-md px-2.5 py-1.5">
            <CheckCircle2 className="size-3.5" />
            On track — daily target hit
          </div>
        )}
      </div>

      {/* Per-platform progress bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {platformStatus.map((p) => {
          const tone = p.pct >= 100 ? "emerald" : p.pct >= 60 ? "amber" : "stone";
          const barColor = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-stone-400";
          return (
            <div key={p.platform}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-stone-700 font-medium truncate">{p.label}</span>
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium ${PACE_CHIP[p.pace]}`}>
                  <Gauge className="size-2.5" /> {PACE_LABEL[p.pace]}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="tabular-nums text-stone-500">
                  {p.count} / {p.target}
                </span>
                <span className="tabular-nums text-stone-500">~{p.hourly}/hr</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`${barColor} h-full transition-all duration-300`}
                  style={{ width: `${Math.min(100, p.pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-stone-500">
        Engagement counts come from <strong>Engage Touch</strong> increments on Notion contacts. Comment on prospects' content → bump their Engage Touch → bar moves up.
      </div>
    </section>
  );
}
