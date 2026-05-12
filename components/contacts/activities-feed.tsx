"use client";

import { useState } from "react";
import { fmtDateTime } from "@/lib/utils";
import { Copy, ExternalLink, MessageSquare, Mail, ScanSearch, Send, Eye, FileText, Check } from "lucide-react";
import type { Activity } from "@/lib/db/schema";

const TYPE_ICON: Record<string, any> = {
  post_observed: Eye,
  comment_drafted: MessageSquare,
  email_drafted: Mail,
  audit_run: ScanSearch,
  follow_up_sent: Send,
  dm_sent: Send,
  note: FileText,
};

const TYPE_LABEL: Record<string, string> = {
  post_observed: "Post observed",
  comment_drafted: "Comment draft",
  email_drafted: "Email draft",
  audit_run: "Site audit",
  follow_up_sent: "Follow-up draft",
  dm_sent: "DM draft",
  note: "Note",
};

export function ActivitiesFeed({ activities }: { activities: Activity[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="text-sm font-semibold text-stone-900 mb-1">Recent Activities</div>
      <div className="text-xs text-stone-500 mb-5">
        Drafts Claude writes here from <code>/scan-hot-leads</code>, <code>/audit</code>, <code>/triage</code>, and <code>/next-message</code>.
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
          No activities yet. Run a slash command in Claude Code to generate drafts for this contact.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {activities.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? FileText;
            const label = TYPE_LABEL[a.type] ?? a.type;
            return (
              <li key={a.id} className="activity-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
                    <Icon className="size-3.5" />
                    {label}
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-400 font-normal">{fmtDateTime(a.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.sourceUrl && (
                      <a
                        href={a.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
                      >
                        <ExternalLink className="size-3" /> source
                      </a>
                    )}
                    <button
                      onClick={() => copy(a.id, a.content)}
                      className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
                    >
                      {copiedId === a.id ? (
                        <>
                          <Check className="size-3 text-green-600" /> copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm text-stone-800 leading-relaxed">
                  {a.content}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
