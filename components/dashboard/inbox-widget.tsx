import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { CHANNEL_LABELS, CHANNEL_COLORS, type InboxChannel } from "@/lib/inbox";
import type { InboxItem } from "@/lib/db/inbox-view";

export function InboxWidget({ items, total, byChannel }: { items: InboxItem[]; total: number; byChannel: Record<string, number> }) {
  const top = items.slice(0, 3);
  const channels = Object.entries(byChannel).filter(([, n]) => n > 0).slice(0, 4);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Inbox className="size-4 text-stone-400" /> Inbox
        </div>
        <Link href="/inbox" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="text-3xl font-semibold text-stone-900 tabular-nums mb-3">{total}</div>

      {channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {channels.map(([ch, n]) => (
            <Link
              key={ch}
              href={`/inbox?channel=${ch}`}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${CHANNEL_COLORS[ch as InboxChannel] ?? "bg-stone-100 text-stone-800 border-stone-200"}`}
            >
              {CHANNEL_LABELS[ch as InboxChannel] ?? ch} · {n}
            </Link>
          ))}
        </div>
      )}

      {top.length === 0 ? (
        <div className="text-sm text-stone-500 py-4 text-center">Inbox zero. Nice.</div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {top.map((i) => (
            <li key={i.contact.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link href={`/contacts/${i.contact.id}`} className="text-sm font-medium text-stone-900 truncate block hover:underline">
                  {i.contact.name}
                </Link>
                <div className="text-xs text-stone-500 truncate">
                  {i.contact.status} · {i.daysSince ?? 0}d {i.reason === "follow_up_overdue" ? "overdue" : "waiting"}
                </div>
              </div>
              <span className={`text-[11px] rounded px-1.5 py-0.5 border ${CHANNEL_COLORS[i.channel]}`}>
                {CHANNEL_LABELS[i.channel]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
