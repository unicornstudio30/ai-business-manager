// Past messages for a networking contact. Click to expand all three variants.

"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { NetworkingMessage } from "@/lib/db/schema";
import { fmtDateTime, parseJson } from "@/lib/utils";

export function MessageHistoryFeed({ messages }: { messages: NetworkingMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="surface p-8 text-center text-sm text-stone-500">
        No messages drafted yet. Use the wizard above to write your first one.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} />
      ))}
    </div>
  );
}

function MessageRow({ message: m }: { message: NetworkingMessage }) {
  const [open, setOpen] = useState(false);
  const ctx = parseJson<string[]>(m.contextChips, []);
  const cta = parseJson<string[]>(m.ctaChips, []);

  return (
    <div className="surface p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-stone-500">{fmtDateTime(m.createdAt)}</span>
            {m.framework && (
              <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-violet-100 text-violet-800 border border-violet-200">
                {m.framework}
              </span>
            )}
            {m.tone && (
              <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                {m.tone}
              </span>
            )}
            {m.channel && (
              <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-stone-100 text-stone-700 border border-stone-200">
                {m.channel}
              </span>
            )}
            <span className="ml-auto text-[10px] text-stone-400 tabular-nums">
              strength {m.strengthScore ?? 0}
            </span>
          </div>
          <div className="text-sm text-stone-900 mt-1 truncate">
            {m.topic || m.purpose || "(untitled draft)"}
          </div>
          {(ctx.length > 0 || cta.length > 0) && (
            <div className="text-[11px] text-stone-500 mt-1 truncate">
              {ctx.length > 0 && <>Context: {ctx.join(", ")}</>}
              {ctx.length > 0 && cta.length > 0 && <> · </>}
              {cta.length > 0 && <>CTA: {cta.join(", ")}</>}
            </div>
          )}
        </div>
        {open ? <ChevronUp className="size-4 text-stone-400" /> : <ChevronDown className="size-4 text-stone-400" />}
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 border-t border-stone-100 pt-3">
          <Variant label="Short" text={m.generatedShort} />
          <Variant label="Standard" text={m.generatedStandard} />
          <Variant label="Detailed" text={m.generatedDetailed} />
        </div>
      )}
    </div>
  );
}

function Variant({ label, text }: { label: string; text: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  function copy() {
    navigator.clipboard.writeText(text!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-lg border border-stone-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900"
        >
          {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
  );
}
