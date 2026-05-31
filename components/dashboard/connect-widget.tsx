// Dashboard pillar: today's Connect progress + top prospects to connect with.

import { UserPlus, Star } from "lucide-react";
import { PillarWidget, type PillarRow } from "./pillar-widget";
import type { ConnectQueueByPlatform } from "@/lib/db/connect-queue";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";

export function ConnectWidget({
  kpis,
  queue,
  target,
}: {
  kpis: DerivedKpis;
  queue: ConnectQueueByPlatform;
  target: number;
}) {
  const count = kpis.connectionsSent.total;

  // Top 3 prospects ready for first touch
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
      badges: item.isTop50 ? <Star className="size-3 text-amber-500 fill-amber-400" /> : null,
    };
  });

  return (
    <PillarWidget
      title="Connect"
      icon={<UserPlus className="size-4 text-stone-400" />}
      seeAllHref="/connect"
      count={count}
      target={target}
      tone="emerald"
      summaryChips={
        queue.totals.total > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-500">
            <span><Star className="size-3 inline text-amber-500 fill-amber-400" /> {queue.totals.top50} Top 50</span>
            <span>·</span>
            <span>{queue.totals.total} prospects ready</span>
          </div>
        ) : null
      }
      rows={rows}
      emptyMessage="No Prospect-stage contacts. Add some in Notion."
    />
  );
}
