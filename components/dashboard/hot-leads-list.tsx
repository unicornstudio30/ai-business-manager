import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fmtDate, daysAgo } from "@/lib/utils";
import type { Contact } from "@/lib/db/schema";

export function HotLeadsList({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-semibold text-stone-900">
          Leads <span className="text-stone-400 font-normal">({contacts.length})</span>
        </div>
        <Link href="/contacts" className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      {contacts.length === 0 ? (
        <div className="text-sm text-stone-500 py-6 text-center space-y-2">
          <div>No leads showing yet.</div>
          <div className="text-xs leading-relaxed max-w-md mx-auto">
            In Notion CRM, set a contact's <strong>Status</strong> column to one of:
            <span className="block mt-1 text-stone-700 text-[11px]">
              Lead · 1st Lead Follow up · 2nd Lead Follow up · Qualified · Proposal Sent ·
              Post Proposal Follow-up-1 · Post Proposal Follow-up-2 · Booking · First call
            </span>
            <div className="mt-2">
              Then{" "}
              <Link href="/settings" className="text-stone-700 underline">Settings → Sync</Link>{" "}
              to pull.
            </div>
          </div>
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
