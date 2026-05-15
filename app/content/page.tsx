import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { fmtDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const items = await db.select().from(schema.contentItems).limit(200);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Content Calendar</h1>
        <p className="text-sm text-stone-500 mt-1">
          Mirrored from your Notion content calendar. Click the title to open in Notion.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left px-4 py-2.5">Title</th>
              <th className="text-left px-4 py-2.5">LinkedIn</th>
              <th className="text-left px-4 py-2.5">X</th>
              <th className="text-left px-4 py-2.5">Facebook</th>
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
                const notionUrl = c.notionPageId
                  ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`
                  : null;
                return (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {notionUrl ? (
                        <Link href={notionUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {c.title}
                        </Link>
                      ) : (
                        c.title
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700 text-xs">
                      {c.linkedinPublishDate ? fmtDate(c.linkedinPublishDate) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-700 text-xs">
                      {c.xPublishDate ? fmtDate(c.xPublishDate) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-700 text-xs">
                      {c.facebookPublishDate ? fmtDate(c.facebookPublishDate) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {notionUrl && (
                        <Link
                          href={notionUrl}
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
