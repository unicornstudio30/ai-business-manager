import Link from "next/link";
import { ArrowUpRight, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { CHANNEL_COLORS, CHANNEL_LABELS, type InboxChannel } from "@/lib/inbox";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import type { Contact } from "@/lib/db/schema";

type Props = {
  contact: Contact;
  reason: "follow_up_overdue" | "waiting_reply_stale";
  daysSince: number | null;
  channel: InboxChannel;
};

export function InboxRow({ contact, reason, daysSince, channel }: Props) {
  const reasonLabel = reason === "follow_up_overdue" ? "Follow-up overdue" : "Waiting on reply";
  const ReasonIcon = reason === "follow_up_overdue" ? AlertCircle : Clock;
  const reasonTone = reason === "follow_up_overdue" ? "text-red-700" : "text-amber-700";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-20 text-center">
          <div className={`text-sm font-semibold tabular-nums ${reasonTone}`}>
            {daysSince !== null ? `${daysSince}d` : "—"}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 mt-0.5">
            {reason === "follow_up_overdue" ? "overdue" : "waiting"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/contacts/${contact.id}`} className="font-medium text-stone-900 hover:underline truncate">
              {contact.name || "(no name)"}
            </Link>
            {contact.status && (
              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[contact.status as Stage] ?? "bg-stone-100 text-stone-800 border-stone-200"}`}>
                {contact.status}
              </span>
            )}
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${CHANNEL_COLORS[channel]}`}>
              {CHANNEL_LABELS[channel]}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${reasonTone}`}>
            <ReasonIcon className="size-3" />
            {reasonLabel}
            {reason === "follow_up_overdue" && contact.followUpDate && (
              <span className="text-stone-500">· was due {fmtDate(contact.followUpDate)}</span>
            )}
            {reason === "waiting_reply_stale" && contact.lastTouchAt && (
              <span className="text-stone-500">· last touch {fmtDate(contact.lastTouchAt)}</span>
            )}
          </div>
          {contact.remarks && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-1">{contact.remarks}</p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5">
          {contact.contactUrl && (
            <a
              href={contact.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              title="Open social profile"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {contact.notionPageId && (
            <a
              href={`https://www.notion.so/${contact.notionPageId.replace(/-/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              title="Open in Notion (advance stage / set follow-up)"
            >
              N
            </a>
          )}
          <Link
            href={`/contacts/${contact.id}`}
            className="flex items-center gap-1 rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
          >
            Open <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
