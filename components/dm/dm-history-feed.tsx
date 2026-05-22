// Chronological DM history feed — DMs sent + follow-ups + replies received.
// All events are derived from Notion CRM (via inferred activities) or manually
// logged via /api/activities.

import Link from "next/link";
import { Send, MessageCircle, ArrowDownLeft, ExternalLink } from "lucide-react";
import type { DmHistoryItem } from "@/lib/db/dm-history";
import { CHANNEL_COLORS, type InboxChannel } from "@/lib/inbox";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import { fmtDate } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: typeof Send; tone: string }> = {
  dm_sent:        { label: "DM sent",       icon: Send,            tone: "bg-blue-50 text-blue-700 border-blue-200" },
  follow_up_sent: { label: "Follow-up",     icon: MessageCircle,   tone: "bg-violet-50 text-violet-700 border-violet-200" },
  reply_received: { label: "Reply received", icon: ArrowDownLeft,  tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function groupByDay(items: DmHistoryItem[]): { day: string; items: DmHistoryItem[] }[] {
  const groups = new Map<string, DmHistoryItem[]>();
  for (const item of items) {
    const ts = item.activity.createdAt ?? new Date(0);
    const key = ts.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({ day, items }));
}

function dayLabel(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return "Today";
  if (iso === yest) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function DmHistoryFeed({ items }: { items: DmHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
        <Send className="size-8 text-stone-300 mx-auto mb-3" />
        <p className="text-sm text-stone-600 mb-1">No DM history yet.</p>
        <p className="text-xs text-stone-500">
          DM activity will appear here once you send your first message and sync from Notion.
        </p>
      </div>
    );
  }

  const groups = groupByDay(items);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.day} className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 px-1">
            {dayLabel(group.day)} <span className="text-stone-400 font-normal">· {group.items.length} event{group.items.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {group.items.map((item) => {
              const a = item.activity;
              const meta = TYPE_META[a.type] ?? { label: a.type, icon: MessageCircle, tone: "bg-stone-50 text-stone-700 border-stone-200" };
              const Icon = meta.icon;
              const ts = a.createdAt ?? new Date(0);
              const channel = item.channel as InboxChannel | null;
              return (
                <div key={a.id} className="rounded-lg border border-stone-200 bg-white p-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${meta.tone}`}>
                      <Icon className="size-3" /> {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.contact ? (
                          <Link
                            href={`/contacts/${item.contact.id}`}
                            className="text-sm font-medium text-stone-900 hover:underline truncate"
                          >
                            {item.contact.name || "(no name)"}
                          </Link>
                        ) : (
                          <span className="text-sm text-stone-500">(deleted contact)</span>
                        )}
                        {item.contact?.status && (
                          <span className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium ${STAGE_COLORS[item.contact.status as Stage] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}>
                            {item.contact.status}
                          </span>
                        )}
                        {channel && (
                          <span className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium ${CHANNEL_COLORS[channel]}`}>
                            {item.channelLabel}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-stone-400 tabular-nums">
                          {ts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      {a.content && (
                        <p className="text-xs text-stone-600 mt-1 line-clamp-2 whitespace-pre-wrap">{a.content}</p>
                      )}
                      {a.sourceUrl && (
                        <a
                          href={a.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-[11px] text-violet-700 hover:underline"
                        >
                          source <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
