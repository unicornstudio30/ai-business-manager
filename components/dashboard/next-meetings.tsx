import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";
import { fmtDate } from "@/lib/utils";

type Meeting = {
  id: string;
  eventName: string | null;
  scheduledAt: Date | string | null;
  inviteeName: string | null;
  inviteeEmail: string | null;
  contactId: string | null;
  meetingUrl: string | null;
};

function relative(d: Date | null): string {
  if (!d) return "";
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

function timeOf(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function NextMeetings({ meetings, contactName }: { meetings: Meeting[]; contactName: Map<string, string> }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Calendar className="size-4 text-stone-400" />
          Next meetings
        </div>
        <Link href="/meetings" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      {meetings.length === 0 ? (
        <div className="text-sm text-stone-500 py-6 text-center">
          No upcoming meetings.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {meetings.map((m) => {
            const dt = m.scheduledAt ? (typeof m.scheduledAt === "string" ? new Date(m.scheduledAt) : m.scheduledAt) : null;
            return (
              <li key={m.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-900 truncate">{m.eventName || "(untitled)"}</div>
                  <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                    <span className="tabular-nums">{timeOf(dt)} · {fmtDate(dt)}</span>
                    <span className="text-stone-400">· {relative(dt)}</span>
                  </div>
                  {m.contactId && contactName.get(m.contactId) && (
                    <Link href={`/contacts/${m.contactId}`} className="text-xs text-stone-700 hover:underline">
                      {contactName.get(m.contactId)}
                    </Link>
                  )}
                </div>
                {m.meetingUrl && (
                  <a
                    href={m.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-800 flex-shrink-0"
                  >
                    Join
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
