import Link from "next/link";
import { Calendar, Video, ExternalLink, User, Sparkles } from "lucide-react";
import { fmtDate, fmtDateTime } from "@/lib/utils";

type Props = {
  meeting: {
    id: string;
    eventName: string | null;
    scheduledAt: Date | string | null;
    endedAt: Date | string | null;
    status: string | null;
    inviteeName: string | null;
    inviteeEmail: string | null;
    contactId: string | null;
    meetingUrl: string | null;
    notes: string | null;
  };
  contactName?: string | null;
  showRelative?: boolean;
};

function relative(d: Date | null): string {
  if (!d) return "";
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

function timeOf(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function MeetingRow({ meeting, contactName, showRelative = true }: Props) {
  const dt = meeting.scheduledAt ? (typeof meeting.scheduledAt === "string" ? new Date(meeting.scheduledAt) : meeting.scheduledAt) : null;
  const isCanceled = meeting.status === "canceled";

  return (
    <div className={`rounded-xl border bg-white p-4 ${isCanceled ? "opacity-60 border-stone-200" : "border-stone-200 hover:shadow-sm transition-shadow"}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-20 text-center">
          <div className="text-sm font-semibold text-stone-900 tabular-nums">{timeOf(dt)}</div>
          <div className="text-xs text-stone-500">{fmtDate(dt)}</div>
          {showRelative && (
            <div className="text-xs text-stone-400 mt-1">{relative(dt)}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-stone-900 truncate">
            {meeting.eventName || "(untitled)"}
            {isCanceled && <span className="ml-2 text-xs text-red-600 font-normal">canceled</span>}
          </div>
          {(meeting.inviteeName || meeting.inviteeEmail) && (
            <div className="flex items-center gap-1 text-xs text-stone-600 mt-0.5">
              <User className="size-3 text-stone-400" />
              {meeting.contactId && contactName ? (
                <Link href={`/contacts/${meeting.contactId}`} className="hover:underline text-stone-700">
                  {contactName}
                </Link>
              ) : (
                <span>{meeting.inviteeName || meeting.inviteeEmail}</span>
              )}
              {meeting.inviteeEmail && meeting.inviteeName && (
                <span className="text-stone-400 truncate">· {meeting.inviteeEmail}</span>
              )}
            </div>
          )}
          {meeting.notes && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{meeting.notes}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Link
            href={`/meetings/${meeting.id}/brief`}
            className="flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
            title="Open prep brief"
          >
            <Sparkles className="size-3.5" /> Brief
          </Link>
          {meeting.meetingUrl && (
            <a
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              title="Open meeting link"
            >
              <Video className="size-3.5" /> Join
            </a>
          )}
          {meeting.contactId && (
            <Link
              href={`/contacts/${meeting.contactId}`}
              className="flex items-center gap-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
              title="Open contact"
            >
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
