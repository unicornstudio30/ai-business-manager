"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageSquare, Send, ExternalLink } from "lucide-react";
import { icpColor } from "@/lib/icp-scoring";
import { fmtDate, daysAgo } from "@/lib/utils";

type Activity = {
  id: string;
  type: string;
  content: string;
  createdAt: Date | string | null;
};

type Props = {
  id: string;
  name: string;
  stage: string | null;
  status: string | null;
  platform: string | null;
  remarks: string | null;
  contactUrl: string | null;
  notionPageId: string | null;
  score: number;
  lastActivity: Activity | null;
};

export function EngagementRow({
  id, name, status, platform, remarks, contactUrl, notionPageId, score, lastActivity,
}: Props) {
  const [copied, setCopied] = useState<"comment" | "dm" | null>(null);

  async function copy(kind: "comment" | "dm") {
    const cmd =
      kind === "comment"
        ? `/scan-hot-leads --contact=${id}`
        : `/next-message ${id}`;
    await navigator.clipboard.writeText(cmd);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  const lastAge =
    lastActivity?.createdAt
      ? daysAgo(typeof lastActivity.createdAt === "string" ? new Date(lastActivity.createdAt) : lastActivity.createdAt)
      : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Score badge */}
        <span className={`flex-shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg border text-base font-semibold tabular-nums ${icpColor(score)}`}>
          {score}
        </span>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href={`/contacts/${id}`} className="font-medium text-stone-900 hover:underline truncate">
              {name || "(no name)"}
            </Link>
            {status && (
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-700">
                {status}
              </span>
            )}
            {platform && <span className="text-xs text-stone-400">· {platform}</span>}
          </div>
          {remarks && (
            <p className="text-xs text-stone-500 mb-1 line-clamp-1">{remarks}</p>
          )}
          {lastActivity ? (
            <p className="text-xs text-stone-500">
              Last activity: <span className="text-stone-700">{lastActivity.type.replace(/_/g, " ")}</span>
              {lastAge !== null && <> · {lastAge}d ago</>}
            </p>
          ) : (
            <p className="text-xs text-stone-400">No activities yet — fresh contact</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <button
            onClick={() => copy("comment")}
            className="flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            title="Copy slash command for drafting a comment"
          >
            {copied === "comment" ? (
              <><Check className="size-3.5 text-green-600" /> Copied</>
            ) : (
              <><MessageSquare className="size-3.5" /> Comment</>
            )}
          </button>
          <button
            onClick={() => copy("dm")}
            className="flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            title="Copy slash command for drafting the next DM"
          >
            {copied === "dm" ? (
              <><Check className="size-3.5 text-green-600" /> Copied</>
            ) : (
              <><Send className="size-3.5" /> DM</>
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
              title="Open in Notion"
            >
              N
            </a>
          )}
        </div>
      </div>

      {copied && (
        <div className="mt-2 text-xs text-stone-500 bg-stone-50 rounded-md px-3 py-1.5">
          Paste in Claude Code to draft. Result will appear in this contact's Activities feed.
        </div>
      )}
    </div>
  );
}
