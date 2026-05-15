import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { fmtDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-stone-100 text-stone-700",
  "Idea 💡": "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "In Review": "bg-purple-100 text-purple-800",
  "Done": "bg-green-100 text-green-800",
  "Scheduled": "bg-amber-100 text-amber-800",
  "Published ✨": "bg-emerald-100 text-emerald-800",
};

export default async function ContentPage() {
  const items = await db.select().from(schema.contentItems).limit(200);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Content Calendar</h1>
          <p className="text-sm text-stone-500 mt-1">
            Mirrored from your Notion content calendar. Run /sprint 2 in Claude Code to generate 2 weeks of posts.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left px-4 py-2.5">Title</th>
              <th className="text-left px-4 py-2.5 min-w-[200px]">LinkedIn</th>
              <th className="text-left px-4 py-2.5 min-w-[200px]">X</th>
              <th className="text-left px-4 py-2.5 min-w-[200px]">Facebook</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-stone-500">
                  No content items yet. Click <span className="font-medium">Sync Notion</span> to pull.
                </td>
              </tr>
            ) : (
              items.map((c) => {
                const reuseList = (() => {
                  try { return c.reusePlatform ? (JSON.parse(c.reusePlatform) as string[]) : []; }
                  catch { return []; }
                })();
                const repurposeList = (() => {
                  try { return c.repurposePlatform ? (JSON.parse(c.repurposePlatform) as string[]) : []; }
                  catch { return []; }
                })();
                const platformCell = (
                  status: string | null,
                  publishDate: Date | null,
                  metrics: string | null,
                  engagedCsv: string | null,
                  reuseDate: Date | null,
                  liveUrl: string | null,
                ) => {
                  const files = engagedCsv ? engagedCsv.split(",").filter(Boolean) : [];
                  return (
                    <div className="flex flex-col gap-1">
                      {status ? (
                        <span
                          className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-stone-100"}`}
                        >
                          {status}
                        </span>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      )}
                      {publishDate && (
                        <span className="text-[11px] text-stone-700 font-medium" title="Publish date">
                          📅 {fmtDate(publishDate)}
                        </span>
                      )}
                      {liveUrl && (
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-fit items-center gap-1 text-[11px] text-emerald-700 hover:underline"
                          title="Open live post"
                        >
                          🔗 View live →
                        </a>
                      )}
                      {metrics && (
                        <span className="text-[11px] text-stone-600 line-clamp-2" title={metrics}>
                          {metrics}
                        </span>
                      )}
                      {files.length > 0 && (
                        <a
                          href={files[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-700 hover:underline w-fit"
                        >
                          👥 {files.length === 1 ? "1 file" : `${files.length} files`}
                        </a>
                      )}
                      {reuseDate && (
                        <span className="text-[11px] text-stone-500" title="Reuse date">
                          ↻ {fmtDate(reuseDate)}
                        </span>
                      )}
                    </div>
                  );
                };
                return (
                  <tr key={c.id} className="hover:bg-stone-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{c.title}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.type && (
                          <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                            {c.type}
                          </span>
                        )}
                        {c.topics && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            {c.topics}
                          </span>
                        )}
                      </div>
                      {(reuseList.length > 0 || repurposeList.length > 0) && (
                        <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-stone-500">
                          {reuseList.length > 0 && (
                            <div>♻️ Reuse: <span className="text-stone-700">{reuseList.join(", ")}</span></div>
                          )}
                          {repurposeList.length > 0 && (
                            <div>🔁 Repurpose: <span className="text-stone-700">{repurposeList.join(", ")}</span></div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{platformCell(c.linkedinStatus, c.linkedinPublishDate, c.linkedinMetrics, c.linkedinEngagedPeople, c.linkedinReuseDate, c.linkedinUrl)}</td>
                    <td className="px-4 py-3">{platformCell(c.xStatus, c.xPublishDate, c.xMetrics, c.xEngagedPeople, c.xReuseDate, c.xUrl)}</td>
                    <td className="px-4 py-3">{platformCell(c.facebookStatus, c.facebookPublishDate, c.facebookMetrics, c.facebookEngagedPeople, c.facebookReuseDate, c.facebookUrl)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.notionPageId && (
                        <Link
                          href={`https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-stone-500 hover:text-stone-900"
                        >
                          <ExternalLink className="size-3 inline" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
