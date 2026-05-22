// /dm — DM workflow hub (was /inbox).
//
// Three sections:
//   1. DmReminders        — today's per-platform DM + follow-up targets
//   2. Inbox              — contacts who need your move (overdue / waiting reply)
//   3. DmHistoryFeed      — chronological log of DMs sent / follow-ups / replies

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { inboxView } from "@/lib/db/inbox-view";
import { getDmHistory } from "@/lib/db/dm-history";
import { getNotionDerivedKpis } from "@/lib/db/notion-derived-kpis";
import { getEffectiveOutreachLimits } from "@/lib/outreach-config";
import { CHANNEL_LABELS, INBOX_CHANNELS, type InboxChannel } from "@/lib/inbox";
import { InboxRow } from "@/components/inbox/inbox-row";
import { DmReminders } from "@/components/dm/dm-reminders";
import { DmHistoryFeed } from "@/components/dm/dm-history-feed";

export const dynamic = "force-dynamic";

export default async function DmPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const sp = await searchParams;
  const selectedChannel = (sp.channel as InboxChannel | undefined) ?? undefined;

  const today = new Date();
  const [kpis, inboxAll, historyAll, effective] = await Promise.all([
    getNotionDerivedKpis(today),
    inboxView(),
    getDmHistory({ limit: 100 }),
    getEffectiveOutreachLimits(),
  ]);

  const inboxItems = selectedChannel ? inboxAll.filter((i) => i.channel === selectedChannel) : inboxAll;
  const historyItems = selectedChannel ? historyAll.filter((h) => h.channel === selectedChannel) : historyAll;

  // Counts per channel for tabs (union of inbox + history)
  const counts: Record<string, number> = {};
  for (const i of inboxAll) counts[i.channel] = (counts[i.channel] ?? 0) + 1;
  const channelsPresent = INBOX_CHANNELS.filter((c) => (counts[c] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
          DMs · follow-ups · replies
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <MessageSquare className="size-7 text-stone-400" /> DM
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Your DM workflow — derived from Notion CRM status changes. Commenting lives under{" "}
          <a href="/engagement" className="text-violet-700 hover:underline">Engagement</a>.
        </p>
      </div>

      {/* 1. Today's DM targets per platform */}
      <DmReminders kpis={kpis} limits={effective.limits} activeWindow={effective.activeWindow} />

      {/* Channel filter — applies to both inbox and history below */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <Link
          href="/dm"
          className={`text-sm rounded-md px-3 py-1.5 ${!selectedChannel ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
        >
          All <span className="opacity-70">({inboxAll.length})</span>
        </Link>
        {channelsPresent.map((ch) => (
          <Link
            key={ch}
            href={`/dm?channel=${ch}`}
            className={`text-sm rounded-md px-3 py-1.5 ${selectedChannel === ch ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
          >
            {CHANNEL_LABELS[ch]} <span className="opacity-70">({counts[ch]})</span>
          </Link>
        ))}
      </div>

      {/* 2. Inbox — who needs your move */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Needs your move</h2>
          <span className="text-xs text-stone-500">
            Overdue follow-ups + waiting stages stale 3+ days
          </span>
        </div>
        {inboxItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="text-sm text-stone-600 mb-1">
              Inbox zero{selectedChannel ? ` for ${CHANNEL_LABELS[selectedChannel]}` : ""}.
            </p>
            <p className="text-xs text-stone-500">
              Everyone with a follow-up date is in the future, and no one's gone stale in a waiting stage.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {inboxItems.map((item) => (
              <InboxRow
                key={item.contact.id}
                contact={item.contact}
                reason={item.reason}
                daysSince={item.daysSince}
                channel={item.channel}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. DM history */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">DM history</h2>
          <span className="text-xs text-stone-500">Last 30 days · derived from Notion</span>
        </div>
        <DmHistoryFeed items={historyItems} />
      </section>
    </div>
  );
}
