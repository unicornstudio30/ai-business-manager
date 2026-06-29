"use client";

// Quick-log modal for adding a marketing activity. Live point preview as the
// user picks platform/kind/count so they see what they'll earn before saving.

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, Sparkles, Trophy } from "lucide-react";
import {
  ALL_KINDS,
  ALL_PLATFORMS,
  pointsFor,
  type ActivityKind,
  type Platform,
} from "@/lib/marketing/points";

export function LogActivityModal({
  open,
  onClose,
  weekStart,
}: {
  open: boolean;
  onClose: () => void;
  weekStart: string;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [kind, setKind] = useState<ActivityKind>("post");
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;
  const preview = pointsFor(platform, kind, count);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/marketing/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, kind, count, notes, weekStart }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        // Reset + close + refresh
        setCount(1);
        setNotes("");
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
            <Trophy className="size-5 text-amber-600" />
            <h2 className="text-base font-semibold text-stone-900">Log marketing activity</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="m-platform" className="text-xs font-medium text-stone-700 mb-1.5 block">
                Platform
              </label>
              <select
                id="m-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                {ALL_PLATFORMS.map((p) => (
                  <option key={p.platform} value={p.platform}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="m-kind" className="text-xs font-medium text-stone-700 mb-1.5 block">
                Activity
              </label>
              <select
                id="m-kind"
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
            <label htmlFor="m-count" className="text-xs font-medium text-stone-700 mb-1.5 block">
              How many? <span className="text-stone-400 font-normal">(e.g. 3 = three LinkedIn comments)</span>
            </label>
            <input
              id="m-count"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-32 rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div>
            <label htmlFor="m-notes" className="text-xs font-medium text-stone-700 mb-1.5 block">
              Notes <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="m-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. comparison blog vs incumbent tool"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-900">
              <Sparkles className="size-3.5" /> You'll earn
            </div>
            <div className="text-2xl font-semibold tabular-nums text-amber-900">+{preview}</div>
          </div>

          {error && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="size-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 min-h-[44px]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Logging…
              </>
            ) : (
              <>Log +{preview} pts</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
