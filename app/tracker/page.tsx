import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { fmtDate, parseJson } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const entries = await db
    .select()
    .from(schema.trackerEntries)
    .orderBy(desc(schema.trackerEntries.notionCreatedAt))
    .limit(100);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Sales Tracker</h1>
        <p className="text-sm text-stone-500 mt-1">
          Your Notion journal — Daily Sales Reports, weekly reviews, planning notes.
        </p>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
          No entries yet. Click <span className="font-medium">Sync Notion</span> to pull from your Sales Tracker.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => {
            const tags = parseJson<string[]>(e.tags, []);
            return (
              <li key={e.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900">{e.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {fmtDate(e.notionCreatedAt)}
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span key={t} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {e.notionPageId && (
                    <a
                      href={`https://www.notion.so/${e.notionPageId.replace(/-/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
                    >
                      Open in Notion <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
