"use client";

// Sell or Die log modal. Two tabs:
//   Log Stage  — pick a stage from the CRM Status column (every value from
//                lib/stages.ts). Optionally attach one of your owned CRM
//                leads; when set, the source key matches auto-sync so a
//                later Notion sync at the same stage is a no-op.
//   Log Action — freeform "I did N DMs on LinkedIn" (channel + kind + count).

import { useState, useEffect, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, Sparkles, DollarSign, ListChecks } from "lucide-react";
import {
  ALL_CHANNELS,
  ALL_KINDS,
  pointsFor,
  type ActivityKind,
  type Channel,
} from "@/lib/sales/points";
import { STAGE_CREDIT_LIST, pointsForStage, kindForStage } from "@/lib/sales/stage-credits";
import { STAGES, type Stage } from "@/lib/stages";

type MyContact = { id: string; name: string; status: string | null; platform: string | null };

type Mode = "stage" | "activity";

export function LogSalesActivityModal({
  open,
  onClose,
  weekStart,
}: {
  open: boolean;
  onClose: () => void;
  weekStart: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("stage");

  // Shared
  const [channel, setChannel] = useState<Channel>("linkedin");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Stage mode
  const [stage, setStage] = useState<Stage>("Lead");
  const [contactId, setContactId] = useState<string>("");
  const [myContacts, setMyContacts] = useState<MyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Activity mode
  const [kind, setKind] = useState<ActivityKind>("dm_sent");
  const [count, setCount] = useState(1);

  // Load owned leads once when modal opens
  useEffect(() => {
    if (!open || myContacts.length > 0 || contactsLoading) return;
    setContactsLoading(true);
    fetch("/api/contacts/mine")
      .then((r) => r.json())
      .then((data) => setMyContacts(data.items ?? []))
      .catch(() => setMyContacts([]))
      .finally(() => setContactsLoading(false));
  }, [open, myContacts.length, contactsLoading]);

  if (!open) return null;

  const stagePreview = pointsForStage(stage, channel);
  const stageEarnsCredit = kindForStage(stage) !== null;
  const activityPreview = pointsFor(channel, kind, count);
  const picked = myContacts.find((c) => c.id === contactId) || null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const body =
          mode === "stage"
            ? { mode: "stage", stage, channel, contactId: contactId || undefined, notes, weekStart }
            : { mode: "activity", channel, kind, count, notes, weekStart, contactId: contactId || undefined };
        const res = await fetch("/api/sales/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        setNotes("");
        setContactId("");
        setCount(1);
        router.refresh();
        onClose();
      } catch (e: any) {
        setError(e?.message ?? "Log failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-elevation-3 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-stone-900">Log sales activity</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="px-5 pt-3 border-b border-stone-100 flex gap-1">
          <button
            type="button"
            onClick={() => setMode("stage")}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px inline-flex items-center gap-1 transition-colors ${
              mode === "stage" ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            <ListChecks className="size-3.5" /> Log stage (from CRM)
          </button>
          <button
            type="button"
            onClick={() => setMode("activity")}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              mode === "activity" ? "border-emerald-600 text-emerald-700" : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            Log action
          </button>
        </div>

        <form onSubmit={submit} className="p-5 flex flex-col gap-3">
          {mode === "stage" ? (
            <>
              <div>
                <label htmlFor="s-stage" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  CRM Status <span className="text-stone-400 font-normal">(every stage from your Notion Sales CRM)</span>
                </label>
                <select
                  id="s-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  {STAGE_CREDIT_LIST.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.label}
                      {s.kind ? "" : " · no credit"}
                    </option>
                  ))}
                </select>
                {!stageEarnsCredit && (
                  <div className="mt-1 text-[11px] text-amber-700 inline-flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    This stage doesn't earn credit (Prospect / Connection / follow-up stages are covered by activity rows).
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="s-contact" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  For which lead? <span className="text-stone-400 font-normal">(optional; makes it idempotent with Notion sync)</span>
                </label>
                <select
                  id="s-contact"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  disabled={contactsLoading}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-60"
                >
                  <option value="">
                    {contactsLoading ? "Loading your leads…" : myContacts.length === 0 ? "You don't own any CRM leads yet" : "— Any lead / no specific contact —"}
                  </option>
                  {myContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.status ? ` · currently ${c.status}` : ""}
                    </option>
                  ))}
                </select>
                {picked && (
                  <div className="mt-1 text-[11px] text-stone-500">
                    Source key <code className="px-1 bg-stone-100 rounded">contact_stage:{picked.id.slice(0, 8)}…:{stage}</code> — re-logging or syncing at the same stage is a no-op.
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="s-channel-stage" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  Channel <span className="text-stone-400 font-normal">(multiplier on points)</span>
                </label>
                <select
                  id="s-channel-stage"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  {ALL_CHANNELS.map((c) => (
                    <option key={c.channel} value={c.channel}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s-channel" className="text-xs font-medium text-stone-700 mb-1.5 block">
                    Channel
                  </label>
                  <select
                    id="s-channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as Channel)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                  >
                    {ALL_CHANNELS.map((c) => (
                      <option key={c.channel} value={c.channel}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="s-kind" className="text-xs font-medium text-stone-700 mb-1.5 block">
                    Action
                  </label>
                  <select
                    id="s-kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ActivityKind)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                  >
                    {ALL_KINDS.map((k) => (
                      <option key={k.kind} value={k.kind}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="s-count" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  How many? <span className="text-stone-400 font-normal">(e.g. 5 DMs sent = 5)</span>
                </label>
                <input
                  id="s-count"
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-32 rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
              </div>

              {/* Same "For which lead?" picker as Log Stage — ties actions
                  back to a Notion contact so per-lead views group both
                  stage + action logs together. */}
              <div>
                <label htmlFor="s-contact-action" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  For which lead? <span className="text-stone-400 font-normal">(optional; links this action to a Notion contact)</span>
                </label>
                <select
                  id="s-contact-action"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  disabled={contactsLoading}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-60"
                >
                  <option value="">
                    {contactsLoading ? "Loading your leads…" : myContacts.length === 0 ? "You don't own any CRM leads yet" : "— No specific lead —"}
                  </option>
                  {myContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.status ? ` · currently ${c.status}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="s-notes" className="text-xs font-medium text-stone-700 mb-1.5 block">
              Notes <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="s-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. discovery call with Acme's head of ops"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-900">
              <Sparkles className="size-3.5" /> You'll earn
            </div>
            <div className="text-2xl font-semibold tabular-nums text-emerald-900">
              +{mode === "stage" ? stagePreview : activityPreview}
            </div>
          </div>

          {error && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="size-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || (mode === "stage" && !stageEarnsCredit)}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 min-h-[44px]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Logging…
              </>
            ) : (
              <>Log +{mode === "stage" ? stagePreview : activityPreview} pts</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
