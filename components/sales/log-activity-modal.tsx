"use client";

// Sell or Die log modal — one unified form.
//   • Contact picker at the top (from user's owned CRM leads). The picked
//     lead's `platform` becomes the channel — no manual channel dropdown.
//   • Log Stage (primary): pick a CRM Status stage to log a stage flip.
//   • Log Action (nested, optional): "Also log an action" — pick a freeform
//     action + count. Both can be submitted together in one save.
//   • Every log with a contact pushes to the Notion CRM's "Log Actions"
//     column as an audit trail (best-effort).

import { useState, useEffect, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, Sparkles, DollarSign, ListChecks, Zap } from "lucide-react";
import { ALL_KINDS, pointsFor, type ActivityKind } from "@/lib/sales/points";
import { STAGE_CREDIT_LIST, kindForStage } from "@/lib/sales/stage-credits";
import { normalizeChannelFromPlatform } from "@/lib/sales/channel-from-platform";
import { STAGES, type Stage } from "@/lib/stages";

type MyContact = { id: string; name: string; status: string | null; platform: string | null };

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

  const [contactId, setContactId] = useState<string>("");
  const [myContacts, setMyContacts] = useState<MyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Stage vs action are mutually exclusive to avoid double-crediting: a
  // stage (e.g. Lead) already IS an action (discovery_call) under the hood,
  // so logging both would count the same thing twice.
  const [logType, setLogType] = useState<"stage" | "action">("stage");
  const [stage, setStage] = useState<Stage | "">("");
  const [kind, setKind] = useState<ActivityKind | "">("");
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const picked = myContacts.find((c) => c.id === contactId) || null;
  const channel = normalizeChannelFromPlatform(picked?.platform);

  const stagePoints = stage && logType === "stage" ? (() => {
    const k = kindForStage(stage as Stage);
    return k ? pointsFor(channel, k, 1) : 0;
  })() : 0;
  const stageEarnsCredit = stage ? kindForStage(stage as Stage) !== null : false;

  const actionPoints = kind && logType === "action" ? pointsFor(channel, kind as ActivityKind, count) : 0;
  const totalPreview = stagePoints + actionPoints;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (logType === "stage") {
      if (!stage) { setError("Pick a stage"); return; }
      if (!stageEarnsCredit) {
        setError(`Stage '${stage}' doesn't earn credit — pick another`);
        return;
      }
    } else {
      if (!kind) { setError("Pick an action"); return; }
    }
    startTransition(async () => {
      try {
        const body: any = {
          contactId: contactId || undefined,
          notes: notes || undefined,
          weekStart,
        };
        if (logType === "stage") {
          body.stage = stage;
        } else {
          body.kind = kind;
          body.count = count;
        }
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
        setStage("");
        setKind("");
        setCount(1);
        setNotes("");
        setContactId("");
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
            <h2 className="text-base font-semibold text-stone-900">Log stage &amp; action</h2>
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

        <form onSubmit={submit} className="p-5 flex flex-col gap-3">
          {/* Contact picker — top of form. Derives channel + pushes to Notion. */}
          <div>
            <label htmlFor="s-contact" className="text-xs font-medium text-stone-700 mb-1.5 block">
              For which lead? <span className="text-stone-400 font-normal">(from your owned CRM leads)</span>
            </label>
            <select
              id="s-contact"
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
                  {c.status ? ` · ${c.status}` : ""}
                  {c.platform ? ` · ${c.platform}` : ""}
                </option>
              ))}
            </select>
            {picked && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500">
                <span className="inline-flex items-center rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-medium text-stone-700 capitalize">
                  Channel: {channel}
                </span>
                <span className="text-stone-400">(derived from lead's platform)</span>
              </div>
            )}
          </div>

          {/* Mutually exclusive: a stage flip is already an action under the
              hood (Lead = discovery_call), so pick ONE to avoid double-count. */}
          <div>
            <div className="text-xs font-medium text-stone-700 mb-1.5">
              What are you logging?
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLogType("stage")}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                  logType === "stage"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                <ListChecks className="size-3.5" /> Stage tracking
              </button>
              <button
                type="button"
                onClick={() => setLogType("action")}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                  logType === "action"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                <Zap className="size-3.5" /> Action tracking
              </button>
            </div>
          </div>

          {logType === "stage" ? (
            <div>
              <label htmlFor="s-stage" className="text-xs font-medium text-stone-700 mb-1.5 block">
                CRM Status stage <span className="text-stone-400 font-normal">(every value from Notion's Status column)</span>
              </label>
              <select
                id="s-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage | "")}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                <option value="">— Pick a stage —</option>
                {STAGE_CREDIT_LIST.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.label}
                    {s.kind ? "" : " · no credit"}
                  </option>
                ))}
              </select>
              {stage && !stageEarnsCredit && (
                <div className="mt-1 text-[11px] text-amber-700 inline-flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  Prospect / Connection / follow-up stages don't earn credit — pick another.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-kind" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  Action
                </label>
                <select
                  id="s-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ActivityKind | "")}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  <option value="">— Pick an action —</option>
                  {ALL_KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="s-count" className="text-xs font-medium text-stone-700 mb-1.5 block">
                  How many?
                </label>
                <input
                  id="s-count"
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  disabled={!kind}
                  onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:bg-stone-50 disabled:opacity-60"
                />
              </div>
            </div>
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
            <div className="text-2xl font-semibold tabular-nums text-emerald-900">+{totalPreview}</div>
          </div>

          {picked && (
            <div className="text-[11px] text-stone-500">
              This log will be pushed to the Notion CRM's <code className="px-1 bg-stone-100 rounded">Log Actions</code> column on {picked.name}.
            </div>
          )}

          {error && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="size-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || totalPreview === 0}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 min-h-[44px]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Logging…
              </>
            ) : (
              <>Log +{totalPreview} pts</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
