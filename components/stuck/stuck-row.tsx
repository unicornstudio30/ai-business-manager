"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ArrowUpRight, AlertTriangle, ExternalLink } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import type { Contact } from "@/lib/db/schema";

type Props = {
  contact: Contact;
  daysStuck: number;
  threshold: number;
  overBy: number;
  suggestedAction: string;
};

export function StuckRow({ contact, daysStuck, threshold, overBy, suggestedAction }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyTriageCmd() {
    await navigator.clipboard.writeText(`/triage --contact=${contact.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tone = overBy >= 7 ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-24 text-center">
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>
            <AlertTriangle className="size-3" />
            {overBy === 0 ? "due now" : `+${overBy}d`}
          </span>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 mt-1">
            stuck {daysStuck}d
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
            {contact.platform && <span className="text-xs text-stone-400">· {contact.platform}</span>}
          </div>
          <p className="text-sm text-stone-700 mb-1">
            <span className="text-stone-500">Suggested:</span> {suggestedAction}
          </p>
          <div className="text-xs text-stone-500">
            Last touch {fmtDate(contact.lastTouchAt ?? contact.statusDate)} · threshold for stage: {threshold}d
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <button
            onClick={copyTriageCmd}
            className="flex items-center gap-1.5 rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
            title="Copy /triage slash command"
          >
            {copied ? (<><Check className="size-3.5" /> Copied</>) : (<><Copy className="size-3.5" /> Triage</>)}
          </button>
          {contact.contactUrl && (
            <a
              href={contact.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
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
              title="Open in Notion"
            >
              N
            </a>
          )}
          <Link
            href={`/contacts/${contact.id}`}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
            title="Open contact"
          >
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
