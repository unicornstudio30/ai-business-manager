"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const ENTITIES = ["contacts", "content_items", "tracker_entries"] as const;

export function SyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setMsg(null);
    setRunning(true);
    const lines: string[] = [];
    let firstError: string | null = null;

    // Sequential per-entity to fit within Hobby's 10s/function limit.
    for (const entity of ENTITIES) {
      try {
        const res = await fetch(`/api/sync?entity=${entity}`, { method: "POST" });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          firstError = firstError ?? (json.error || `Sync failed for ${entity}`);
          lines.push(`${entity}: ERR`);
          continue;
        }
        const r = json.results?.[0];
        if (r) lines.push(`${entity.replace("_", " ")}: +${r.pulled}↓ ${r.pushed}↑${r.error ? " (" + r.error + ")" : ""}`);
      } catch (e: any) {
        firstError = firstError ?? (e?.message || "Network error");
        lines.push(`${entity}: ERR`);
      }
    }

    setMsg(firstError ?? lines.join("  •  "));
    setRunning(false);
    startTransition(() => router.refresh());
  }

  const busy = pending || running;

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-stone-500 truncate max-w-md">{msg}</span>}
      <button
        onClick={onClick}
        disabled={busy}
        className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Syncing…" : "Sync Notion"}
      </button>
    </div>
  );
}
