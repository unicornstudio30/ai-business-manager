import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { ExternalLink, Calendar as CalendarIcon, Send } from "lucide-react";
import { isBufferConfigured } from "@/lib/buffer/client";
import { CHANNEL_COLORS, CHANNEL_LABELS, platformToChannel, type InboxChannel } from "@/lib/inbox";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-stone-100 text-stone-700",
  "Idea 💡": "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "In Review": "bg-purple-100 text-purple-800",
  "Done": "bg-green-100 text-green-800",
  "Published ✨": "bg-emerald-100 text-emerald-800",
};

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "published" ? "published" : "calendar";
  const selectedChannel = sp.channel ?? undefined;

  const [items, publishedAll] = await Promise.all([
    db
      .select()
      .from(schema.contentItems)
      .orderBy(desc(schema.contentItems.publishDate))
      .limit(200),
    db
      .select()
      .from(schema.publishedPosts)
      .orderBy(desc(schema.publishedPosts.sentAt))
      .limit(500),
  ]);
  const publishedTotal = publishedAll.length;

  const publishedConfigured = isBufferConfigured();
  const publishedPosts = selectedChannel
    ? publishedAll.filter((p) => p.channel === selectedChannel)
    : publishedAll;

  const publishedCounts: Record<string, number> = {};
  for (const p of publishedAll) {
    if (!p.channel) continue;
    publishedCounts[p.channel] = (publishedCounts[p.channel] ?? 0) + 1;
  }
  const channels = Object.entries(publishedCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Content Calendar</h1>
          <p className="text-sm text-stone-500 mt-1">
            {view === "published"
              ? "Published posts pulled from Buffer (LinkedIn + Twitter). URLs link to the live post."
              : "Mirrored from your Notion content calendar. Run /sprint 2 in Claude Code to generate 2 weeks of posts."}
          </p>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-stone-200">
        <Link
          href="/content"
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === "calendar" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-900"}`}
        >
          <CalendarIcon className="size-4" />
          Calendar <span className="text-xs text-stone-400">({items.length})</span>
        </Link>
        <Link
          href="/content?view=published"
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === "published" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-900"}`}
        >
          <Send className="size-4" />
          Published <span className="text-xs text-stone-400">({publishedTotal})</span>
        </Link>
      </div>

      {view === "calendar" ? (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Publish</th>
                <th className="text-left px-4 py-2.5">Framework</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-stone-500">
                    No content items yet. Click <span className="font-medium">Sync Notion</span> to pull.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{c.title}</td>
                    <td className="px-4 py-3 text-stone-700">{c.type || "—"}</td>
                    <td className="px-4 py-3">
                      {c.status && (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? "bg-stone-100"}`}>
                          {c.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{fmtDate(c.publishDate)}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{c.framework || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {c.notionPageId && (
                        <a
                          href={`https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-stone-500 hover:text-stone-900"
                        >
                          <ExternalLink className="size-3 inline" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {!publishedConfigured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-medium mb-1">Buffer not connected</div>
              <div className="text-amber-800">
                Set <code className="px-1 bg-amber-100 rounded">BUFFER_TOKEN</code> in <code className="px-1 bg-amber-100 rounded">.env.local</code> + Vercel env vars.
              </div>
            </div>
          )}

          {channels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
              <Link
                href="/content?view=published"
                className={`text-sm rounded-md px-3 py-1.5 ${!selectedChannel ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                All <span className="opacity-70">({publishedAll.length})</span>
              </Link>
              {channels.map(([ch, n]) => {
                const inboxCh = (platformToChannel(ch) ?? ch) as InboxChannel;
                const label = CHANNEL_LABELS[inboxCh] ?? ch;
                return (
                  <Link
                    key={ch}
                    href={`/content?view=published&channel=${ch}`}
                    className={`text-sm rounded-md px-3 py-1.5 ${selectedChannel === ch ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
                  >
                    {label} <span className="opacity-70">({n})</span>
                  </Link>
                );
              })}
            </div>
          )}

          {publishedPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <Send className="size-8 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-600 mb-1">
                {!publishedConfigured ? "Connect Buffer to see your published posts." : "No published posts yet — try Sync."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {publishedPosts.map((p) => {
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
                        <Link href="/content" className="text-blue-700 hover:underline">
                          Linked to Notion content item →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
