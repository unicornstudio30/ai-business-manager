import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";
import { computeIcpScore, icpColor } from "@/lib/icp-scoring";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import { fmtDate, parseJson } from "@/lib/utils";
import { Star, Download, ExternalLink, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const NOTION_CRM_URL = "https://www.notion.so/35d0b601369a80519256ec4232d5f6a8";

export default async function Top50Page() {
  const rows = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.top50, 1))
    .orderBy(desc(schema.contacts.statusDate));

  // Group by platform for the per-platform CSV buttons
  const platformCounts = new Map<string, number>();
  for (const c of rows) {
    if (!c.platform) continue;
    platformCounts.set(c.platform, (platformCounts.get(c.platform) ?? 0) + 1);
  }
  const platforms = Array.from(platformCounts.entries()).sort((a, b) => b[1] - a[1]);

  const isOver = rows.length > 50;
  const isUnder = rows.length < 50;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Long-term relationships</div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
            <Star className="size-7 text-amber-500 fill-amber-400" /> Top 50
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Marked in Notion CRM via the <strong>Top 50</strong> checkbox. Refine the list in Notion, sync, and download fresh CSVs anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={NOTION_CRM_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            Edit in Notion CRM <ExternalLink className="size-3.5" />
          </Link>
          <a href="/api/top-50/csv" download className="btn-primary">
            <Download className="size-4" /> Download all ({rows.length})
          </a>
        </div>
      </div>

      {/* List size guardrail */}
      {isOver && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 flex items-center gap-2 shadow-elevation-1">
          <AlertCircle className="size-4 text-amber-700" />
          You've marked <strong>{rows.length}</strong> as Top 50. Trim down to 50 in Notion to keep the list focused.
        </div>
      )}
      {isUnder && rows.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 flex items-center gap-2">
          <AlertCircle className="size-4 text-stone-400" />
          {rows.length} marked so far — add {50 - rows.length} more in Notion to fill out the list.
        </div>
      )}
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <Star className="size-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-600 mb-2">No Top 50 contacts yet.</p>
          <p className="text-xs text-stone-500">
            Open <Link href={NOTION_CRM_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Notion CRM</Link>, tick the "Top 50" checkbox on contacts you want long-term relationships with, then click Sync.
          </p>
        </div>
      )}

      {/* Per-platform CSV downloads */}
      {platforms.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-900 mb-2">Download by platform</h2>
          <div className="flex flex-wrap gap-2">
            {platforms.map(([p, n]) => (
              <a
                key={p}
                href={`/api/top-50/csv?platform=${encodeURIComponent(p)}`}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 ease-material"
              >
                <Download className="size-3" />
                {p} <span className="text-stone-400">({n})</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* List */}
      {rows.length > 0 && (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="text-left px-4 py-2.5">ICP</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Stage</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">Platform</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">Country</th>
                <th className="text-left px-4 py-2.5 hidden lg:table-cell">Profession</th>
                <th className="text-left px-4 py-2.5 hidden lg:table-cell">Last touch</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((c) => {
                const professions = parseJson<string[]>(c.profession, []);
                const icp = computeIcpScore(c).score;
                return (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-10 rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums ${icpColor(icp)}`}>
                        {icp}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="text-stone-900 font-medium hover:underline">
                        {c.name || "(no name)"}
                      </Link>
                      {c.email && <div className="text-xs text-stone-500">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {c.status && (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[c.status as Stage] ?? "bg-stone-100 text-stone-800 border-stone-200"}`}>
                          {c.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700 hidden md:table-cell">{c.platform || "—"}</td>
                    <td className="px-4 py-3 text-stone-700 hidden md:table-cell">{c.country || "—"}</td>
                    <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">{professions.slice(0, 2).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">{fmtDate(c.lastTouchAt ?? c.statusDate)}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
