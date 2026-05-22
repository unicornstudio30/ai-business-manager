// Engagement reminders bar — shows daily targets vs actuals + nudges per platform.
// Engagement counts come from notion-derived-kpis.commentsToday (Engage Touch
// increments) per platform. Targets come from lib/sales-limits.ts.

import { AlertCircle, CheckCircle2, Target } from "lucide-react";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import { PLATFORM_LIMITS, target, type PlatformKey, PLATFORMS_ORDER } from "@/lib/sales-limits";

const PLATFORM_HAS_COMMENT_TARGET: PlatformKey[] = ["linkedin", "x", "instagram", "facebook", "reddit", "discord"];

// We need a daily comment target per platform. PLATFORM_LIMITS no longer has
// 'comment' (removed earlier since Engage Touch covers it), so we use a
// simple per-platform target based on healthy outreach: 60% of the DM cap.
function commentTarget(p: PlatformKey): number {
  const dmMax = (PLATFORM_LIMITS[p].actions as any).dm?.max ?? 30;
  return Math.floor(dmMax * 0.4);  // ~40% of DM volume as comments — moderate but consistent
}

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

export function EngagementReminders({ kpis }: { kpis: DerivedKpis }) {
  const today = kpis.commentsToday.total;
  const byPlatform = kpis.commentsToday.byPlatform;

  // Compute reminders per platform
  const platformStatus = PLATFORM_HAS_COMMENT_TARGET.map((p) => {
    const count = (byPlatform as any)[p] ?? 0;
    const tgt = commentTarget(p);
    const pct = tgt > 0 ? Math.round((count / tgt) * 100) : 0;
    return { platform: p, label: PLATFORM_LIMITS[p].label, count, target: tgt, pct };
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
                <span className="text-stone-700 font-medium">{p.label}</span>
                <span className="tabular-nums text-stone-500">
                  {p.count} / {p.target}
                </span>
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
