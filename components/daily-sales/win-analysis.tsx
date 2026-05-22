// Today's Win Analysis panel — pulls today's Notion Sales Tracker entry body.
// If you've written a daily sales report (with Best Channel / Best Hook / etc.),
// it'll render here as-is. "Edit in Notion" button opens the page.

import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { and, gte, lt, desc } from "drizzle-orm";
import { Trophy, ExternalLink, NotebookPen } from "lucide-react";

export async function WinAnalysisPanel() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const rows = await db
    .select()
    .from(schema.trackerEntries)
    .where(and(
      gte(schema.trackerEntries.notionCreatedAt, today),
      lt(schema.trackerEntries.notionCreatedAt, tomorrow)
    ))
    .orderBy(desc(schema.trackerEntries.notionCreatedAt))
    .limit(1);
  const entry = rows[0] ?? null;

  const trackerDbUrl = "https://www.notion.so/35d0b601369a80f8ade3d37534cd7281";

  return (
    <section className="surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-stone-900">Today's Win Analysis</h2>
        </div>
        {entry?.notionPageId ? (
          <Link
            href={`https://www.notion.so/${entry.notionPageId.replace(/-/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900"
          >
            Edit in Notion <ExternalLink className="size-3" />
          </Link>
        ) : (
          <Link
            href={trackerDbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <NotebookPen className="size-3.5" />
            Start today's entry in Notion
          </Link>
        )}
      </div>

      {entry ? (
        <div>
          <div className="text-xs text-stone-500 mb-2">
            {entry.name || "(untitled entry)"}
          </div>
          {entry.bodyMarkdown ? (
            <div className="prose prose-sm max-w-none text-stone-700 whitespace-pre-wrap leading-relaxed">
              {entry.bodyMarkdown}
            </div>
          ) : (
            <div className="text-sm text-stone-400 italic">
              Entry exists but the body hasn't synced yet. Open in Notion to fill it in.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/40 p-6 text-center">
          <p className="text-sm text-stone-600 mb-1">
            No tracker entry for today yet.
          </p>
          <p className="text-xs text-stone-500">
            Use Notion's <strong>Daily Sales Report</strong> template to capture: best channel,
            best hook (ACA), best time of day, hot leads to prioritize tomorrow,
            objections faced, working ACA templates, competitor intel.
          </p>
        </div>
      )}
    </section>
  );
}
