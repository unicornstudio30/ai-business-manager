// Dashboard pillar: today's Engage (commenting) progress + top contacts in the
// engagement queue.

import { Flame, Sparkles, Star } from "lucide-react";
import { PillarWidget, type PillarRow } from "./pillar-widget";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";
import type { EngagementQueueByPlatform } from "@/lib/db/engagement-queue";

export function EngagementWidget({
  kpis,
  queue,
  target,
}: {
  kpis: DerivedKpis;
  queue: EngagementQueueByPlatform;
  target: number;
}) {
  const count = kpis.commentsToday.total;

  // Top 3 priority contacts across all platforms
  const allItems = Object.values(queue.byPlatform).flat();
  allItems.sort((a, b) => b.priority - a.priority);
  const top = allItems.slice(0, 3);

  const rows: PillarRow[] = top.map((item) => {
    const c = item.contact;
    return {
      id: c.id,
      name: c.name || "(no name)",
      meta: `${c.platform || "—"} · ICP ${item.icpScore}`,
      href: `/contacts/${c.id}`,
      badges: (
        <>
          {item.isTop50 && <Star className="size-3 text-amber-500 fill-amber-400" />}
          {item.isHot && <Flame className="size-3 text-red-500" />}
          {item.relations.includes("Engager") && <Sparkles className="size-3 text-emerald-500" />}
        </>
      ),
    };
  });

  return (
    <PillarWidget
      title="Engage"
      icon={<Flame className="size-4 text-stone-400" />}
      seeAllHref="/engagement"
      count={count}
      target={target}
      tone="violet"
      summaryChips={
        queue.totals.total > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-500">
            <span><Star className="size-3 inline text-amber-500 fill-amber-400" /> {queue.totals.top50} Top 50</span>
            <span>·</span>
            <span><Flame className="size-3 inline text-red-500" /> {queue.totals.hot} hot</span>
            <span>·</span>
            <span><Sparkles className="size-3 inline text-emerald-500" /> {queue.totals.engager} engagers</span>
          </div>
        ) : null
      }
      rows={rows}
      emptyMessage="No contacts in engagement queue."
    />
  );
}
