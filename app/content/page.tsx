import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { fmtDate, parseJson } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-stone-100 text-stone-700",
  "Idea 💡": "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "In Review": "bg-purple-100 text-purple-800",
  "Done": "bg-green-100 text-green-800",
  "Published ✨": "bg-emerald-100 text-emerald-800",
};

export default async function ContentPage() {
  const items = await db
    .select()
    .from(schema.contentItems)
    .orderBy(desc(schema.contentItems.publishDate))
    .limit(200);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Content Calendar</h1>
          <p className="text-sm text-stone-500 mt-1">
            Mirrored from your Notion content calendar. Run <code>/sprint 2</code> in Claude Code to generate 2 weeks of posts.
          </p>
        </div>
      </div>
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
    </div>
  );
}
