// Daily engagement queue grouped by platform. Each row: ICP badge, name,
// stage chip, Top 50/Hot/Engager indicators, and TWO clickable buttons:
//   - Profile (opens contact.contactUrl in new tab)
//   - Notion (opens contact's Notion page)
// Per-platform CSV download.

import Link from "next/link";
import { ExternalLink, Download, Star, Flame, Sparkles } from "lucide-react";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import { icpColor } from "@/lib/icp-scoring";
import type { EngagementQueueByPlatform } from "@/lib/db/engagement-queue";

export function EngagementQueuePlatform({ data }: { data: EngagementQueueByPlatform }) {
  if (data.platformOrder.length === 0) {
    return (
      <div className="surface p-8 text-center text-sm text-stone-500">
        No active contacts in your engagement queue.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Daily engagement queue · by platform</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Top 50 · Hot · Engager pinned. Click <strong>Profile</strong> to engage, click <strong>Notion</strong> to update.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span><Star className="size-3 inline text-amber-500 fill-amber-400" /> {data.totals.top50}</span>
          <span><Flame className="size-3 inline text-red-500" /> {data.totals.hot}</span>
          <span><Sparkles className="size-3 inline text-emerald-500" /> {data.totals.engager}</span>
          <a href="/api/engagement/queue-csv" download className="btn-secondary">
            <Download className="size-3.5" /> Download all
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.platformOrder.map((platform) => {
          const items = data.byPlatform[platform];
          return (
            <section key={platform} className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">{platform}</h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">{items.length} in queue</p>
                </div>
                <a
                  href={`/api/engagement/queue-csv?platform=${encodeURIComponent(platform)}`}
                  download
                  className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50"
                >
                  <Download className="size-3" /> CSV
                </a>
              </div>

              <ul className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto">
                {items.slice(0, 15).map((item) => {
                  const c = item.contact;
                  return (
                    <li key={c.id} className="rounded-lg border border-stone-100 px-2.5 py-2 hover:bg-stone-50">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-9 rounded-md border px-1 py-0.5 text-[10px] font-medium tabular-nums ${icpColor(item.icpScore)}`}>
                          {item.icpScore}
                        </span>
                        <Link href={`/contacts/${c.id}`} className="flex-1 min-w-0 text-xs font-medium text-stone-900 hover:underline truncate">
                          {c.name || "(no name)"}
                        </Link>
                        <div className="flex items-center gap-0.5">
                          {item.isTop50 && (
                            <Star className="size-3 text-amber-500 fill-amber-400" aria-label="Top 50" />
                          )}
                          {item.isHot && (
                            <Flame className="size-3 text-red-500" aria-label="Hot" />
                          )}
                          {item.relations.includes("Engager") && (
                            <Sparkles className="size-3 text-emerald-500" aria-label="Engager" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px] text-stone-500">
                        {c.status && (
                          <span className={`inline-flex items-center rounded px-1 py-px ${STAGE_COLORS[c.status as Stage] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}>
                            {c.status}
                          </span>
                        )}
                        {item.touchCount > 0 && <span>· {item.touchCount} touches</span>}
                        {item.relations.length > 0 && <span>· {item.relations.join(", ")}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {item.profileUrl ? (
                          <a
                            href={item.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] text-violet-800 hover:bg-violet-100"
                          >
                            Profile <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-stone-400">no profile URL</span>
                        )}
                        {item.notionUrl && (
                          <a
                            href={item.notionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-stone-50"
                          >
                            Notion <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
                {items.length > 15 && (
                  <li className="text-[11px] text-stone-400 px-2">+{items.length - 15} more — download CSV for full list</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
