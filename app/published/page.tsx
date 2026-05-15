import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { isBufferConfigured } from "@/lib/buffer/client";
import { CHANNEL_COLORS, CHANNEL_LABELS, platformToChannel, type InboxChannel } from "@/lib/inbox";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { ExternalLink, Send } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublishedPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const sp = await searchParams;
  const selectedChannel = sp.channel ?? undefined;

  const allPosts = await db
    .select()
    .from(schema.publishedPosts)
    .orderBy(desc(schema.publishedPosts.sentAt))
    .limit(500);

  const posts = selectedChannel
    ? allPosts.filter((p) => p.channel === selectedChannel)
    : allPosts;

  const counts: Record<string, number> = {};
  for (const p of allPosts) {
    if (!p.channel) continue;
    counts[p.channel] = (counts[p.channel] ?? 0) + 1;
  }
  const channels = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const configured = isBufferConfigured();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <Send className="size-6 text-stone-400" /> Published Posts
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Posts pulled from Buffer (LinkedIn + Twitter). URLs link to the live post. Engagement metrics
          will appear here once you add <span className="font-medium">Buffer Analyze</span> or the Apify scraping path.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-medium mb-1">Buffer not connected</div>
          <div className="text-amber-800">
            Set <code className="px-1 bg-amber-100 rounded">BUFFER_TOKEN</code> in <code className="px-1 bg-amber-100 rounded">.env.local</code> + Vercel env vars.
          </div>
        </div>
      )}

      {/* Channel filter */}
      {channels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
          <Link
            href="/published"
            className={`text-sm rounded-md px-3 py-1.5 ${!selectedChannel ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
          >
            All <span className="opacity-70">({allPosts.length})</span>
          </Link>
          {channels.map(([ch, n]) => {
            const inboxCh = (platformToChannel(ch) ?? ch) as InboxChannel;
            const label = CHANNEL_LABELS[inboxCh] ?? ch;
            return (
              <Link
                key={ch}
                href={`/published?channel=${ch}`}
                className={`text-sm rounded-md px-3 py-1.5 ${selectedChannel === ch ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {label} <span className="opacity-70">({n})</span>
              </Link>
            );
          })}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <Send className="size-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-600 mb-1">
            {!configured ? "Connect Buffer to see your published posts." : "No published posts yet — try Sync."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => {
            const inboxCh = (platformToChannel(p.channel) ?? p.channel ?? "other") as InboxChannel;
            const chColor = CHANNEL_COLORS[inboxCh] ?? "bg-stone-100 text-stone-800 border-stone-200";
            return (
              <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${chColor}`}>
                      {CHANNEL_LABELS[inboxCh] ?? p.channel}
                    </span>
                    {p.channelName && <span className="text-stone-400">@{p.channelName}</span>}
                    <span className="text-stone-400">·</span>
                    <span>{fmtDateTime(p.sentAt)}</span>
                  </div>
                  {p.externalLink && (
                    <a
                      href={p.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      View post <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {p.text}
                </p>
                {/* Placeholder for engagement metrics (filled by Apify/Buffer Analyze later) */}
                {(p.impressions || p.likes || p.comments) ? (
                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-4 text-xs text-stone-600">
                    {p.impressions !== null && <span>👁 {p.impressions}</span>}
                    {p.likes !== null && <span>❤ {p.likes}</span>}
                    {p.comments !== null && <span>💬 {p.comments}</span>}
                    {p.shares !== null && <span>↗ {p.shares}</span>}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-stone-400">
                    Engagement metrics will appear here once Apify / Buffer Analyze is wired up.
                  </div>
                )}
                {p.contentItemId && (
                  <div className="mt-2 text-xs">
                    <Link href={`/content`} className="text-blue-700 hover:underline">
                      Linked to Notion content item →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
