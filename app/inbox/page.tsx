import Link from "next/link";
import { inboxView } from "@/lib/db/inbox-view";
import { CHANNEL_LABELS, INBOX_CHANNELS, type InboxChannel } from "@/lib/inbox";
import { InboxRow } from "@/components/inbox/inbox-row";
import { Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const sp = await searchParams;
  const selectedChannel = (sp.channel as InboxChannel | undefined) ?? undefined;

  // Fetch ALL items once for counts, then filter for display.
  const all = await inboxView();
  const items = selectedChannel ? all.filter((i) => i.channel === selectedChannel) : all;

  // Counts per channel
  const counts: Record<string, number> = {};
  for (const i of all) counts[i.channel] = (counts[i.channel] ?? 0) + 1;
  const channelsPresent = INBOX_CHANNELS.filter((c) => (counts[c] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <Inbox className="size-6 text-stone-400" /> Inbox
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Contacts who need your move — derived from Notion CRM. A contact lands here when their{" "}
          <code className="px-1 bg-stone-100 rounded text-xs">Follow-up Date</code> is past, or they're in a
          waiting stage and haven't been touched in 3+ days.
        </p>
      </div>

      {/* Channel tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <Link
          href="/inbox"
          className={`text-sm rounded-md px-3 py-1.5 ${!selectedChannel ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
        >
          All <span className="opacity-70">({all.length})</span>
        </Link>
        {channelsPresent.map((ch) => (
          <Link
            key={ch}
            href={`/inbox?channel=${ch}`}
            className={`text-sm rounded-md px-3 py-1.5 ${selectedChannel === ch ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
          >
            {CHANNEL_LABELS[ch]} <span className="opacity-70">({counts[ch]})</span>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <Inbox className="size-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-600 mb-1">Inbox zero{selectedChannel ? ` for ${CHANNEL_LABELS[selectedChannel]}` : ""}.</p>
          <p className="text-xs text-stone-500">
            {selectedChannel ? (
              <Link href="/inbox" className="text-stone-700 hover:underline">View all channels</Link>
            ) : (
              "Everyone with a follow-up date is in the future, and no one's gone stale in a waiting stage."
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
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
    </div>
  );
}
