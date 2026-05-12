import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fmtDate, daysAgo } from "@/lib/utils";
import type { Contact } from "@/lib/db/schema";

export function HotLeadsList({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="text-sm font-semibold text-stone-900 mb-4">Hot leads — act now</div>
      {contacts.length === 0 ? (
        <div className="text-sm text-stone-500 py-8 text-center">
          No hot leads right now. Run <code className="px-1.5 py-0.5 bg-stone-100 rounded">/scan-hot-leads</code> in Claude Code once you have some.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {contacts.map((c) => {
            const age = daysAgo(c.statusDate);
            return (
              <li key={c.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {c.name || "(no name)"}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {c.status} · {age !== null ? `${age}d ago` : fmtDate(c.statusDate)}
                  </div>
                </div>
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
