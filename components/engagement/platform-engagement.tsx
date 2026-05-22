import Link from "next/link";
import { Download, ExternalLink, Flame } from "lucide-react";
import type { EngagementByPlatform, EngagementLevel } from "@/lib/db/engagement-by-platform";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import { icpColor } from "@/lib/icp-scoring";
import { fmtDate } from "@/lib/utils";

const LEVEL_LABEL: Record<EngagementLevel, string> = {
  highly_engaged: "🔥 Highly engaged",
  touched: "Touched",
  cold: "Cold",
};
const LEVEL_BADGE: Record<EngagementLevel, string> = {
  highly_engaged: "bg-emerald-100 text-emerald-800 border-emerald-200",
  touched: "bg-amber-100 text-amber-800 border-amber-200",
  cold: "bg-stone-100 text-stone-700 border-stone-200",
};

export function PlatformEngagementSection({ data }: { data: EngagementByPlatform }) {
  const platforms = Object.keys(data.byPlatform).sort((a, b) => {
    return data.byPlatform[b].length - data.byPlatform[a].length;
  });

  if (platforms.length === 0) {
    return (
      <div className="surface p-8 text-center text-sm text-stone-500">
        No active contacts to engage with yet. Add prospects in Notion CRM.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">By platform · {data.totals.total} active contacts</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            🔥 {data.totals.highlyEngaged} highly engaged · {data.totals.touched} touched · {data.totals.cold} cold
          </p>
        </div>
        <a href="/api/engagement/csv" download className="btn-secondary">
          <Download className="size-4" /> Download all
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const contacts = data.byPlatform[platform];
          const todayActions = data.dailyActivityByPlatform[platformToChannelKey(platform)] ?? 0;
          const counts = {
            highly_engaged: contacts.filter((c) => c.level === "highly_engaged").length,
            touched: contacts.filter((c) => c.level === "touched").length,
            cold: contacts.filter((c) => c.level === "cold").length,
          };
          return (
            <section key={platform} className="surface p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-stone-900">{platform}</h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {contacts.length} contacts · {todayActions} action{todayActions === 1 ? "" : "s"} today
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={`/api/engagement/csv?platform=${encodeURIComponent(platform)}`}
                    download
                    className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50"
                  >
                    <Download className="size-3" /> CSV
                  </a>
                </div>
              </div>

              {/* Level counts row */}
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {(["highly_engaged", "touched", "cold"] as EngagementLevel[]).map((lvl) => (
                  <span
                    key={lvl}
                    className={`text-[10px] px-1.5 py-0.5 rounded-md border tabular-nums ${LEVEL_BADGE[lvl]}`}
                  >
                    {LEVEL_LABEL[lvl]} {counts[lvl]}
                  </span>
                ))}
              </div>

              {/* Top engaged contacts */}
              <ul className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
                {contacts.slice(0, 12).map(({ contact: c, level, icpScore, touchCount, relations, hasRecentActivity, lastTouchAt }) => (
                  <li key={c.id} className="rounded-lg border border-stone-100 px-2.5 py-2 hover:bg-stone-50">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-9 rounded-md border px-1 py-0.5 text-[10px] font-medium tabular-nums ${icpColor(icpScore)}`}>
                        {icpScore}
                      </span>
                      <Link href={`/contacts/${c.id}`} className="flex-1 min-w-0 text-xs font-medium text-stone-900 hover:underline truncate">
                        {c.name || "(no name)"}
                      </Link>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] ${LEVEL_BADGE[level]}`}>
                        {level === "highly_engaged" ? "🔥" : level === "touched" ? "•" : "·"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 ml-11 flex-wrap text-[10px] text-stone-500">
                      {c.status && (
                        <span className={`inline-flex items-center rounded px-1 py-px ${STAGE_COLORS[c.status as Stage] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}>
                          {c.status}
                        </span>
                      )}
                      {touchCount > 0 && <span>· {touchCount} touches</span>}
                      {relations.length > 0 && <span>· {relations.join(", ")}</span>}
                      {hasRecentActivity && <span className="text-emerald-700">· today</span>}
                      {lastTouchAt && !hasRecentActivity && <span>· last {fmtDate(lastTouchAt)}</span>}
                    </div>
                  </li>
                ))}
                {contacts.length > 12 && (
                  <li className="text-[11px] text-stone-400 px-2">+{contacts.length - 12} more — see full list in CSV</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Notion Platform string (e.g., "Linkedin") → InboxChannel slug for dailyActivityByPlatform lookup
function platformToChannelKey(p: string): string {
  const lower = p.toLowerCase();
  if (lower === "x" || lower === "twitter") return "x";
  return lower;
}
