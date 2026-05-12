import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { fmtDate, parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const audits = await db
    .select()
    .from(schema.audits)
    .orderBy(desc(schema.audits.createdAt))
    .limit(100);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Site Audits</h1>
        <p className="text-sm text-stone-500 mt-1">
          Audits Claude runs via <code>/audit &lt;url&gt;</code>. Each one comes with a drafted ACA outreach email.
        </p>
      </div>
      {audits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
          No audits yet. Run <code className="px-1.5 py-0.5 bg-stone-100 rounded">/audit https://prospect-site.com</code> in Claude Code.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {audits.map((a) => {
            const scores = parseJson<Record<string, number>>(a.scores, {});
            return (
              <li key={a.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-stone-900 hover:underline break-all">
                      {a.url}
                    </a>
                    <div className="text-xs text-stone-500 mt-0.5">{fmtDate(a.createdAt)}</div>
                    {a.summary && <p className="mt-2 text-sm text-stone-700 line-clamp-3">{a.summary}</p>}
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(scores).map(([k, v]) => (
                      <div key={k} className="rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-700 text-center min-w-[3rem]">
                        <div className="font-semibold">{v}</div>
                        <div className="text-stone-500">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
