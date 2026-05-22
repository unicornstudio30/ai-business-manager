// Daily CONNECT queue grouped by platform. Each row: ICP badge, name,
// Top 50 indicator, profile + Notion buttons. Source: Prospect-stage contacts.

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { icpColor } from "@/lib/icp-scoring";
import type { ConnectQueueByPlatform } from "@/lib/db/connect-queue";

export function ConnectQueuePlatform({ data }: { data: ConnectQueueByPlatform }) {
  if (data.platformOrder.length === 0) {
    return (
      <div className="surface p-8 text-center text-sm text-stone-500">
        No Prospect-stage contacts to connect with. Add some in Notion CRM (Status = Prospect).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Connect queue · by platform</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Prospects waiting for first outreach. Top 50 pinned. Click <strong>Profile</strong> to send the connect request,
            then move them to <code className="px-1 bg-stone-100 rounded">1st message</code> (or <code className="px-1 bg-stone-100 rounded">In-mail</code>) in Notion.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span><Star className="size-3 inline text-amber-500 fill-amber-400" /> {data.totals.top50}</span>
          <span>· {data.totals.total} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.platformOrder.map((platform) => {
          const items = data.byPlatform[platform];
          return (
            <section key={platform} className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">{platform}</h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">{items.length} prospects</p>
                </div>
              </div>

              <ul className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto">
                {items.slice(0, 15).map((item) => {
                  const c = item.contact;
                  return (
                    <li key={c.id} className="rounded-lg border border-stone-100 px-2.5 py-2 hover:bg-stone-50">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-9 rounded-md border px-1 py-0.5 text-[10px] font-medium tabular-nums ${icpColor(item.icpScore)}`}>
                          {item.icpScore}
                        </span>
                        <Link href={`/contacts/${c.id}`} className="flex-1 min-w-0 text-xs font-medium text-stone-900 hover:underline truncate">
                          {c.name || "(no name)"}
                        </Link>
                        {item.isTop50 && (
                          <Star className="size-3 text-amber-500 fill-amber-400" aria-label="Top 50" />
                        )}
                      </div>
                      {item.relations.length > 0 && (
                        <div className="mt-1 text-[10px] text-stone-500 truncate">
                          {item.relations.join(", ")}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {item.profileUrl ? (
                          <a
                            href={item.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-800 hover:bg-emerald-100"
                          >
                            Profile <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-stone-400">no profile URL</span>
                        )}
                        {item.notionUrl && (
                          <a
                            href={item.notionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-stone-50"
                          >
                            Notion <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
                {items.length > 15 && (
                  <li className="text-[11px] text-stone-400 px-2">+{items.length - 15} more</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
