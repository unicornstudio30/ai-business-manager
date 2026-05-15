"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Wand2, Check } from "lucide-react";

type Kpi = {
  coldDmsSent?: number | null;
  coldEmailsSent?: number | null;
  followUpsSent?: number | null;
  warmDmsSent?: number | null;
  responses?: number | null;
  callsBooked?: number | null;
  commentsOnProspects?: number | null;
  newProspects?: number | null;
  inboundLeads?: number | null;
  notes?: string | null;
};

type Suggested = {
  coldDmsSent: number;
  coldEmailsSent: number;
  followUpsSent: number;
  commentsOnProspects: number;
  warmDmsSent: number;
  responses: number;
  callsBooked: number;
  newProspects: number;
  inboundLeads: number;
};

const FIELDS: Array<{ key: keyof Suggested; label: string; target?: number; emoji?: string }> = [
  { key: "coldDmsSent", label: "Cold DMs", target: 8, emoji: "📨" },
  { key: "coldEmailsSent", label: "Cold emails", target: 7, emoji: "✉️" },
  { key: "followUpsSent", label: "Follow-ups", target: 15, emoji: "↩️" },
  { key: "warmDmsSent", label: "Warm DMs", target: 5, emoji: "🔥" },
  { key: "commentsOnProspects", label: "Comments", target: 12, emoji: "💬" },
  { key: "responses", label: "Responses", emoji: "✅" },
  { key: "callsBooked", label: "Calls booked", target: 1, emoji: "📞" },
  { key: "newProspects", label: "New prospects", target: 5, emoji: "🆕" },
  { key: "inboundLeads", label: "Inbound leads", emoji: "🎯" },
];

export function TodayCard({ today, suggested }: { today: Kpi | null; suggested: Suggested }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initialState: Record<string, number> = {};
  for (const f of FIELDS) initialState[f.key] = (today?.[f.key] as number | null | undefined) ?? 0;
  const [values, setValues] = useState(initialState);
  const [notes, setNotes] = useState(today?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, n: number) {
    setValues((v) => ({ ...v, [key]: Math.max(0, n) }));
  }

  function applySuggested() {
    const next: Record<string, number> = {};
    for (const f of FIELDS) {
      next[f.key] = Math.max(values[f.key] ?? 0, suggested[f.key] ?? 0);
    }
    setValues(next);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/daily-sales/today", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    startTransition(() => router.refresh());
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Today</div>
          <div className="text-lg font-semibold text-stone-900">{todayLabel}</div>
        </div>
        <button
          onClick={applySuggested}
          className="flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
          title="Pull counts from today's activities"
        >
          <Wand2 className="size-3.5" /> Apply suggested
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FIELDS.map((f) => {
          const val = values[f.key] ?? 0;
          const sug = suggested[f.key];
          const pct = f.target ? Math.min(100, Math.round((val / f.target) * 100)) : 0;
          const tone =
            f.target && pct >= 100
              ? "bg-green-500"
              : f.target && pct >= 50
              ? "bg-amber-500"
              : "bg-stone-300";
          return (
            <div key={f.key} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-medium text-stone-600">
                  {f.emoji} {f.label}
                </span>
                {f.target && (
                  <span className="text-[10px] text-stone-500 tabular-nums">/{f.target}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => set(f.key, val - 1)}
                  className="w-7 h-7 rounded-md border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                >
                  −
                </button>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(f.key, Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-center text-sm tabular-nums"
                />
                <button
                  onClick={() => set(f.key, val + 1)}
                  className="w-7 h-7 rounded-md border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                >
                  +
                </button>
              </div>
              {f.target && (
                <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                  <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              )}
              {sug > 0 && sug !== val && (
                <button
                  onClick={() => set(f.key, sug)}
                  className="mt-1 text-[10px] text-violet-700 hover:text-violet-900"
                >
                  Suggested: {sug}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-1">
          Notes
        </label>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Win? Loss? Block? Anything you want to remember about today."
          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm font-sans"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? (
            "Saving…"
          ) : saved ? (
            <>
              <Check className="size-4 text-green-300" /> Saved
            </>
          ) : (
            <>
              <Save className="size-4" /> Save day
            </>
          )}
        </button>
      </div>
    </div>
  );
}
