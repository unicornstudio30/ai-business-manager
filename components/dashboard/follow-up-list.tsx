import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fmtDate, daysAgo } from "@/lib/utils";
import type { Contact } from "@/lib/db/schema";

export function FollowUpList({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-semibold text-stone-900">
          Follow up <span className="text-stone-400 font-normal">({contacts.length})</span>
        </div>
        <Link
          href="/contacts"
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
        >
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="text-xs text-stone-500 mb-4">last interaction 11+ days ago</div>
      {contacts.length === 0 ? (
        <div className="text-sm text-stone-500 py-8 text-center">
          All current leads are within 10 days. If you just updated Notion, hit{" "}
          <Link href="/settings" className="text-stone-700 underline">Settings → Sync</Link>{" "}
          to pull the latest.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {contacts.map((c) => {
            const age = daysAgo(c.statusDate);
            const tone = (age ?? 0) > 21 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
            return (
              <li key={c.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {c.name || "(no name)"}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {c.status} · {fmtDate(c.statusDate)}
                  </div>
                </div>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${tone}`}>
                  {age ?? "?"}d
                </span>
                <Link
                  href={`/contacts/${c.id}`}
                  className="flex items-center gap-1 rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Open <ArrowUpRight className="size-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
