import { db, schema } from "@/lib/db/client";
import { upcomingMeetings, recentMeetings } from "@/lib/db/meetings";
import { isGcalConfigured } from "@/lib/gcal/sync";
import { MeetingRow } from "@/components/meetings/meeting-row";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const [upcoming, recent, contacts] = await Promise.all([
    upcomingMeetings(40),
    recentMeetings(14, 20),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
  ]);
  const contactName = new Map(contacts.map((c) => [c.id, c.name]));
  const configured = isGcalConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Meetings</h1>
        <p className="text-sm text-stone-500 mt-1">
          From your Google Calendar. Click <span className="font-medium">Sync Notion</span> to also pull the latest from Google Calendar.
          Auto-links to contacts when invitee email matches.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-medium mb-1">Google Calendar not connected</div>
          <div className="text-amber-800">
            Get the secret ICS URL from Google Calendar (Settings → Integrate calendar → Secret address in iCal format),
            then add <code className="px-1 bg-amber-100 rounded">GCAL_ICS_URL</code> to <code className="px-1 bg-amber-100 rounded">.env.local</code> + Vercel env vars.
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
          <Calendar className="size-4 text-stone-400" />
          Upcoming <span className="text-stone-400 font-normal">({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            No upcoming meetings. {configured ? "Click Sync Notion to refresh from Google Calendar." : "Connect Google Calendar above."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                contactName={m.contactId ? contactName.get(m.contactId) : null}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3">
          Recent <span className="text-stone-400 font-normal">(last 14 days · {recent.length})</span>
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            No recent meetings.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                contactName={m.contactId ? contactName.get(m.contactId) : null}
                showRelative={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
