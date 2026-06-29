"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, Check } from "lucide-react";

type Summary = {
  scanned: { content: number; networking: number; crm: number };
  inserted: { content: number; networking: number; crm: number; total: number };
  attribution: {
    workspaceOwner: { id: string; name: string } | null;
    unmappedOwnerNames: string[];
  };
};

export function AutoSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [last, setLast] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/marketing/auto-sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        setLast(data);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Auto-sync failed");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 min-h-[40px]"
        title="Pull latest content publishes, sent DMs, and CRM activity into the leaderboard"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Auto-sync
      </button>
      {last && (
        <div className="text-[11px] text-stone-500 inline-flex items-center gap-1">
          <Check className="size-3 text-green-600" />
          +{last.inserted.total} new (
          {last.inserted.content}c · {last.inserted.networking}n · {last.inserted.crm}crm)
          {last.attribution.unmappedOwnerNames.length > 0 && (
            <span className="text-amber-700" title={last.attribution.unmappedOwnerNames.join(", ")}>
              · {last.attribution.unmappedOwnerNames.length} unmapped
            </span>
          )}
        </div>
      )}
      {error && <div className="text-[11px] text-red-700">{error}</div>}
    </div>
  );
}
