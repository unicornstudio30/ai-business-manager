"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp, ScanSearch } from "lucide-react";
import { fmtDate, parseJson } from "@/lib/utils";
import type { Audit } from "@/lib/db/schema";

const SCORE_LABEL: Record<string, string> = {
  design: "Design",
  copy: "Copy",
  conversion: "Conversion",
  speed_signal: "Speed",
  speed: "Speed",
};

function scoreColor(v: number): string {
  if (v >= 4) return "text-green-700 bg-green-50";
  if (v >= 3) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export function AuditCard({ audit, contactName }: { audit: Audit; contactName?: string | null }) {
  const [showEmail, setShowEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  const scores = parseJson<Record<string, number>>(audit.scores, {});
  const detectedStack = parseJson<string[]>(audit.detectedStack, []);
  const missingPages = parseJson<string[]>(audit.missingPages, []);

  async function copyEmail() {
    if (!audit.emailDraft) return;
    await navigator.clipboard.writeText(audit.emailDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <a
            href={audit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-stone-900 hover:underline break-all"
          >
            {audit.url} <ExternalLink className="size-3 flex-shrink-0" />
          </a>
          <div className="text-xs text-stone-500 mt-0.5">{fmtDate(audit.createdAt)}</div>
          {audit.contactId && contactName && (
            <Link
              href={`/contacts/${audit.contactId}`}
              className="text-xs text-stone-700 hover:underline mt-1 inline-block"
            >
              For: {contactName}
            </Link>
          )}
        </div>
        {Object.keys(scores).length > 0 && (
          <div className="flex gap-1.5 flex-shrink-0">
            {Object.entries(scores).map(([k, v]) => (
              <div key={k} className={`rounded-md px-2 py-1 text-center min-w-[3rem] ${scoreColor(v)}`}>
                <div className="text-sm font-semibold tabular-nums">{v}/5</div>
                <div className="text-[10px] uppercase tracking-wide opacity-80">{SCORE_LABEL[k] ?? k}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {audit.summary && (
        <p className="text-sm text-stone-700 leading-relaxed mb-3">{audit.summary}</p>
      )}

      {(detectedStack.length > 0 || missingPages.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {detectedStack.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-stone-500">Stack:</span>
              {detectedStack.map((s) => (
                <span key={s} className="rounded bg-blue-50 text-blue-800 px-1.5 py-0.5">{s}</span>
              ))}
            </div>
          )}
          {missingPages.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-stone-500">Missing:</span>
              {missingPages.map((p) => (
                <span key={p} className="rounded bg-red-50 text-red-700 px-1.5 py-0.5">{p}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {audit.emailDraft && (
        <>
          <div className="flex items-center gap-2 border-t border-stone-100 pt-3">
            <button
              onClick={() => setShowEmail((s) => !s)}
              className="flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
            >
              {showEmail ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              Drafted email
            </button>
            <button
              onClick={copyEmail}
              className="ml-auto flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-green-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" /> Copy
                </>
              )}
            </button>
          </div>
          {showEmail && (
            <pre className="mt-2 whitespace-pre-wrap text-sm text-stone-800 leading-relaxed bg-stone-50 rounded-md p-3 font-sans">
              {audit.emailDraft}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
