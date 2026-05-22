// Dashboard glance: today's engagement (commenting) progress + top contacts
// in the engagement queue. Mirrors the DM widget so Saidur can see both
// pillars of his daily outreach at a glance.

import Link from "next/link";
import { ArrowUpRight, Flame, Sparkles, Star } from "lucide-react";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import type { EngagementQueueByPlatform } from "@/lib/db/engagement-queue";
import { PLATFORM_LIMITS, type PlatformKey } from "@/lib/sales-limits";

const ENGAGEMENT_PLATFORMS: PlatformKey[] = ["linkedin", "x", "instagram", "facebook", "reddit"];

function commentTarget(p: PlatformKey): number {
  const dmMax = (PLATFORM_LIMITS[p].actions as any).dm?.max ?? 30;
  return Math.floor(dmMax * 0.4);
}

export function EngagementWidget({
  kpis,
  queue,
}: {
  kpis: DerivedKpis;
  queue: EngagementQueueByPlatform;
}) {
  const grandTarget = ENGAGEMENT_PLATFORMS.reduce((s, p) => {
    const t = commentTarget(p);
    return s + (t > 0 ? t : 0);
  }, 0);
  const grandTotal = kpis.commentsToday.total;
  const pct = grandTarget > 0 ? Math.round((grandTotal / grandTarget) * 100) : 0;

  // Top 3 priority contacts across all platforms
  const allItems = Object.values(queue.byPlatform).flat();
  allItems.sort((a, b) => b.priority - a.priority);
  const top = allItems.slice(0, 3);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Flame className="size-4 text-stone-400" /> Engagement
        </div>
        <Link href="/engagement" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="text-3xl font-semibold text-stone-900 tabular-nums">
        {grandTotal} <span className="text-base text-stone-400 font-normal">/ {grandTarget}</span>
      </div>
      <div className="mt-1 mb-4 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-stone-400"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 text-[11px] text-stone-500">
        <span><Star className="size-3 inline text-amber-500 fill-amber-400" /> {queue.totals.top50} Top 50</span>
        <span>·</span>
        <span><Flame className="size-3 inline text-red-500" /> {queue.totals.hot} hot</span>
        <span>·</span>
        <span><Sparkles className="size-3 inline text-emerald-500" /> {queue.totals.engager} engagers</span>
      </div>

      {top.length === 0 ? (
        <div className="text-sm text-stone-500 py-4 text-center">No contacts in engagement queue.</div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {top.map((item) => {
            const c = item.contact;
            return (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-stone-900 truncate block hover:underline">
                    {c.name || "(no name)"}
                  </Link>
                  <div className="text-xs text-stone-500 truncate">
                    {c.platform || "—"} · ICP {item.icpScore}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {item.isTop50 && <Star className="size-3 text-amber-500 fill-amber-400" />}
                  {item.isHot && <Flame className="size-3 text-red-500" />}
                  {item.relations.includes("Engager") && <Sparkles className="size-3 text-emerald-500" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
