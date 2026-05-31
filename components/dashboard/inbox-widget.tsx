// Dashboard pillar: today's DM target progress + inbox (contacts who need your move).

import { MessageSquare } from "lucide-react";
import { PillarWidget, type PillarRow } from "./pillar-widget";
import { CHANNEL_LABELS, CHANNEL_COLORS, type InboxChannel } from "@/lib/inbox";
import type { InboxItem } from "@/lib/db/inbox-view";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";

export function InboxWidget({
  items,
  total,
  byChannel,
  kpis,
  target,
}: {
  items: InboxItem[];
  total: number;
  byChannel: Record<string, number>;
  kpis: DerivedKpis;
  target: number;
}) {
  // Count = today's actual outreach (1st messages + InMails + follow-ups)
  const count =
    kpis.connectionsSent.total + kpis.inmailsSent.total + kpis.followUpsSent.total;

  const top = items.slice(0, 3);
  const channels = Object.entries(byChannel)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const rows: PillarRow[] = top.map((i) => ({
    id: i.contact.id,
    name: i.contact.name,
    meta: `${i.contact.status ?? "—"} · ${i.daysSince ?? 0}d ${i.reason === "follow_up_overdue" ? "overdue" : "waiting"}`,
    href: `/contacts/${i.contact.id}`,
    chip: { label: CHANNEL_LABELS[i.channel], tone: CHANNEL_COLORS[i.channel] },
  }));

  return (
    <PillarWidget
      title="DM"
      icon={<MessageSquare className="size-4 text-stone-400" />}
      seeAllHref="/dm"
      count={count}
      target={target}
      tone="blue"
      summaryChips={
        total > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-500">
            <span>{total} need your move</span>
            {channels.length > 0 && <span>·</span>}
            {channels.map(([ch, n]) => (
              <span
                key={ch}
                className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium border ${CHANNEL_COLORS[ch as InboxChannel] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}
              >
                {CHANNEL_LABELS[ch as InboxChannel] ?? ch} · {n}
              </span>
            ))}
          </div>
        ) : null
      }
      rows={rows}
      emptyMessage="Inbox zero. Nice."
    />
  );
}
