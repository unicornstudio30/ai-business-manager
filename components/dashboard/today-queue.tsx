import Link from "next/link";
import { CalendarCheck, Repeat2, Clock } from "lucide-react";
import { db, schema } from "@/lib/db/client";
import { lte, and, isNotNull } from "drizzle-orm";
import { computeCadence, dueToday } from "@/lib/cadences";
import { upcomingMeetings } from "@/lib/db/meetings";
import { fmtDate } from "@/lib/utils";

export async function TodayQueue() {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1) Cadence steps due today/overdue
  const allContacts = await db.select().from(schema.contacts);
  const cadenceItems = allContacts.map((c) => computeCadence(c)).filter((x): x is NonNullable<typeof x> => !!x);
  const cadenceDue = dueToday(cadenceItems).slice(0, 8);

  // 2) Follow-ups whose date is today or past
  const followUps = await db
    .select()
    .from(schema.contacts)
    .where(and(isNotNull(schema.contacts.followUpDate), lte(schema.contacts.followUpDate, endOfDay)))
    .limit(8);

  // 3) Meetings today
  const meetings = (await upcomingMeetings(8)).filter((m) => {
    if (!m.scheduledAt) return false;
    return m.scheduledAt <= endOfDay;
  });

  const total = cadenceDue.length + followUps.length + meetings.length;
  if (total === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-sm text-emerald-800">
        ✅ Nothing due today. Clear queue.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="size-4 text-amber-700" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Today's queue — {total} item{total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cadence steps */}
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-stone-700 mb-1.5">
            <Repeat2 className="size-3" /> Cadence ({cadenceDue.length})
          </div>
          {cadenceDue.length === 0 ? (
            <div className="text-xs text-stone-400">none</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {cadenceDue.map((c) => (
                <li key={c.contact.id} className="text-xs">
                  <Link href={`/contacts/${c.contact.id}`} className="text-stone-800 hover:underline">
                    {c.contact.name || "(no name)"}
                  </Link>
                  <span className="text-stone-400"> · step {c.nextStep?.step} ({c.daysUntilDue === 0 ? "today" : `${Math.abs(c.daysUntilDue ?? 0)}d overdue`})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Follow-ups */}
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-stone-700 mb-1.5">
            <CalendarCheck className="size-3" /> Follow-ups ({followUps.length})
          </div>
          {followUps.length === 0 ? (
            <div className="text-xs text-stone-400">none</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {followUps.map((c) => (
                <li key={c.id} className="text-xs">
                  <Link href={`/contacts/${c.id}`} className="text-stone-800 hover:underline">
                    {c.name || "(no name)"}
                  </Link>
                  <span className="text-stone-400"> · {fmtDate(c.followUpDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Meetings */}
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-stone-700 mb-1.5">
            <CalendarCheck className="size-3" /> Meetings ({meetings.length})
          </div>
          {meetings.length === 0 ? (
            <div className="text-xs text-stone-400">none</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {meetings.map((m) => (
                <li key={m.id} className="text-xs">
                  <span className="text-stone-800">{m.eventName || "(untitled)"}</span>
                  <span className="text-stone-400"> · {m.scheduledAt ? m.scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
