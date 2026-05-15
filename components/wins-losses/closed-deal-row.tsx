"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, X, ShieldOff, Save, Plus, ArrowUpRight } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import type { ClosedDeal } from "@/lib/db/wins-losses";

const ICONS = {
  win: Trophy,
  loss: X,
  disqualified: ShieldOff,
};
const TONES = {
  win: "bg-green-50 text-green-800 border-green-200",
  loss: "bg-red-50 text-red-800 border-red-200",
  disqualified: "bg-stone-50 text-stone-700 border-stone-200",
};

export function ClosedDealRow({ deal }: { deal: ClosedDeal }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(deal.reasonActivity?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  async function saveReason() {
    if (!reason.trim() || !deal.contact.id) return;
    setSaving(true);
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_id: deal.contact.id,
        type: "closed_reason",
        content: reason.trim(),
      }),
    });
    setSaving(false);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  const Icon = ICONS[deal.outcome];
  const tone = TONES[deal.outcome];

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${tone}`}>
            <Icon className="size-5" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/contacts/${deal.contact.id}`} className="font-medium text-stone-900 hover:underline truncate">
              {deal.contact.name || "(no name)"}
            </Link>
            {deal.contact.status && (
              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[deal.contact.status as Stage]}`}>
                {deal.contact.status}
              </span>
            )}
            <span className="text-xs text-stone-400">· closed {fmtDate(deal.closedAt)}</span>
          </div>

          {!editing && deal.reasonActivity && (
            <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{deal.reasonActivity.content}</p>
          )}

          {!editing && !deal.reasonActivity && (
            <button
              onClick={() => setEditing(true)}
              className="mt-1 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900"
            >
              <Plus className="size-3" /> Add reason
            </button>
          )}

          {editing && (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={
                  deal.outcome === "win"
                    ? "Why did we win? (e.g., guarantee + custom-built positioning resonated; founder valued speed over price)"
                    : deal.outcome === "loss"
                    ? "Why did we lose? (e.g., budget approved internal hire instead; competitor offered template at half price)"
                    : "Why was this disqualified?"
                }
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm font-sans"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1">
                  Cancel
                </button>
                <button
                  onClick={saveReason}
                  disabled={!reason.trim() || saving}
                  className="flex items-center gap-1 rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  <Save className="size-3" /> {saving ? "Saving…" : "Save reason"}
                </button>
              </div>
            </div>
          )}

          {!editing && deal.reasonActivity && (
            <button onClick={() => setEditing(true)} className="mt-1 text-xs text-stone-500 hover:text-stone-900 underline">
              Edit reason
            </button>
          )}
        </div>
        <Link
          href={`/contacts/${deal.contact.id}`}
          className="flex-shrink-0 rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
          title="Open contact"
        >
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
