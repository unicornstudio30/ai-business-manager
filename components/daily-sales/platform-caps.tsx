// Per-platform daily-cap progress bars. Reads today's derived activity counts
// per channel and shows how close we are to each platform's safe daily limits.
// Green = safe (below target), amber = warn (between target and 90% of max),
// red = danger (>= 90% of max).

import Link from "next/link";
import {
  PLATFORM_LIMITS,
  PLATFORMS_ORDER,
  target,
  maxFor,
  capStatus,
  type PlatformKey,
  type ActionKey,
} from "@/lib/sales-limits";
import { ExternalLink } from "lucide-react";

// Map InboxChannel (from platformBreakdownForDate) → PlatformKey
function channelToPlatform(channel: string): PlatformKey | null {
  switch (channel) {
    case "linkedin": return "linkedin";
    case "x": return "x";
    case "instagram": return "instagram";
    case "facebook": return "facebook";
    case "reddit": return "reddit";
    case "discord": return "discord";
    case "email": return "email";
    default: return null;
  }
}

// PlatformDayCounts shape from lib/db/daily-kpis.ts
export type PlatformCountsForCaps = {
  channel: string;
  label: string;
  total: number;
  dms: number;
  comments: number;
  followUps: number;
  emails: number;
  posts_observed: number;
  audits: number;
  notes: number;
};

const TONE_COLORS: Record<string, string> = {
  safe: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
};

const BG_TONE: Record<string, string> = {
  safe: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
};

function CapBar({
  platform,
  action,
  count,
  isWarmup,
}: {
  platform: PlatformKey;
  action: ActionKey;
  count: number;
  isWarmup?: boolean;
}) {
  const t = target(platform, action, isWarmup);
  const m = maxFor(platform, action);
  if (m === 0) return null;
  const status = capStatus(count, platform, action, isWarmup);
  const pctOfMax = Math.min(100, Math.round((count / m) * 100));
  const pctOfTarget = t === 0 ? 0 : Math.min(100, Math.round((count / t) * 100));
  const label = (PLATFORM_LIMITS[platform].actions as any)[action]?.label ?? action;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-stone-600">{label}</span>
        <span className="tabular-nums">
          <span className={status === "danger" ? "text-red-700 font-semibold" : status === "warn" ? "text-amber-700" : "text-stone-700"}>
            {count}
          </span>
          <span className="text-stone-400"> / {t} <span className="text-stone-300">({m} max)</span></span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-stone-100 overflow-hidden">
        {/* Target line marker */}
        <div className="absolute top-0 bottom-0 w-px bg-stone-400" style={{ left: `${(t / m) * 100}%` }} />
        <div
          className={`h-full ${TONE_COLORS[status]} transition-all duration-300`}
          style={{ width: `${pctOfMax}%` }}
        />
      </div>
    </div>
  );
}

export function PlatformCapsPanel({ counts, isWarmup }: { counts: PlatformCountsForCaps[]; isWarmup?: boolean }) {
  // Index by platform key for fast lookup
  const byPlatform = new Map<PlatformKey, PlatformCountsForCaps>();
  for (const c of counts) {
    const p = channelToPlatform(c.channel);
    if (p) byPlatform.set(p, c);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Today vs safe daily limits</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Target = 75% of platform max (25% safety buffer). {isWarmup && <span className="text-amber-700">⚠ Warm-up mode active.</span>}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PLATFORMS_ORDER.map((p) => {
          const data = byPlatform.get(p);
          const cfg = PLATFORM_LIMITS[p];
          const actionKeys = Object.keys(cfg.actions) as ActionKey[];
          return (
            <div key={p} className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-stone-900">{cfg.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">
                  {data ? data.total : 0} action{data?.total === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {actionKeys.map((action) => {
                  let count = 0;
                  if (data) {
                    if (action === "dm") count = data.dms;
                    else if (action === "comment") count = data.comments;
                    else if (action === "follow_up") count = data.followUps;
                    else if (action === "connect" || action === "inmail") count = 0;
                  }
                  return (
                    <CapBar key={action} platform={p} action={action} count={count} isWarmup={isWarmup} />
                  );
                })}
              </div>
              <Link
                href="https://www.notion.so/35d0b601369a80519256ec4232d5f6a8"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900"
              >
                Edit in Notion CRM <ExternalLink className="size-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
