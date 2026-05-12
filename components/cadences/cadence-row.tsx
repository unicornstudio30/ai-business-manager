"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MessageSquare, Forward, SkipForward, ExternalLink } from "lucide-react";
import { fmtDate } from "@/lib/utils";

type Props = {
  id: string;
  name: string;
  status: string | null;
  notionPageId: string | null;
  contactUrl: string | null;
  track: string;
  currentStep: number;
  nextStepNumber: number;
  nextStepBrief: string;
  nextStepChannel: string;
  daysUntilDue: number;
  dueDate: Date | string | null;
  isFinal: boolean;
};

export function CadenceRow({
  id, name, status, notionPageId, contactUrl,
  track, currentStep, nextStepNumber, nextStepBrief, nextStepChannel,
  daysUntilDue, dueDate, isFinal,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(`/next-message ${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const overdue = daysUntilDue < 0;
  const dueLabel =
    daysUntilDue === 0 ? "Due today" :
    daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` :
    `Due in ${daysUntilDue}d`;
  const dueTone =
    overdue ? "text-red-700 bg-red-50 border-red-200" :
    daysUntilDue === 0 ? "text-amber-800 bg-amber-50 border-amber-200" :
    "text-stone-600 bg-stone-50 border-stone-200";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Due badge */}
        <div className="flex-shrink-0 w-24 text-center">
          <span className={`inline-block rounded-md border px-2 py-1 text-xs font-semibold ${dueTone}`}>
            {dueLabel}
          </span>
          {dueDate && (
            <div className="text-xs text-stone-400 mt-1">
              {fmtDate(typeof dueDate === "string" ? new Date(dueDate) : dueDate)}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/contacts/${id}`} className="font-medium text-stone-900 hover:underline truncate">
              {name || "(no name)"}
            </Link>
            {status && (
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-700">
                {status}
              </span>
            )}
            <span className="text-xs text-stone-400 capitalize">· {track} track</span>
          </div>
          <div className="text-xs text-stone-500 mb-0.5">
            Step <span className="font-medium text-stone-700">{currentStep}</span> → <span className="font-medium text-stone-700">{nextStepNumber}</span>
            <span className="text-stone-400"> · channel: {nextStepChannel}</span>
            {isFinal && <span className="text-amber-700 ml-2">(final step)</span>}
          </div>
          <p className="text-sm text-stone-800">{nextStepBrief}</p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <button
            onClick={copyCommand}
            className="flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
            title="Copy slash command for the next message"
          >
            {copied ? (
              <><Check className="size-3.5" /> Copied</>
            ) : (
              <><MessageSquare className="size-3.5" /> Draft next</>
            )}
          </button>
          {contactUrl && (
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              title="Open social profile"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {notionPageId && (
            <a
              href={`https://www.notion.so/${notionPageId.replace(/-/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              title="Open in Notion to advance the stage"
            >
              N
            </a>
          )}
        </div>
      </div>
      {copied && (
        <div className="mt-2 text-xs text-stone-500 bg-stone-50 rounded-md px-3 py-1.5">
          Paste in Claude Code to draft the next message. Once sent, advance the contact's stage in Notion (N icon).
        </div>
      )}
    </div>
  );
}
