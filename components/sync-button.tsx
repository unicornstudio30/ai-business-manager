"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";

const ENTITIES = ["contacts", "content_items", "tracker_entries"] as const;

// Auto-sync interval. Ticks only while tab is visible.
// Set NEXT_PUBLIC_AUTO_SYNC_MINUTES=0 to disable auto-sync entirely.
const AUTO_SYNC_MINUTES = Number(process.env.NEXT_PUBLIC_AUTO_SYNC_MINUTES ?? 5);

function relTime(ts: number | null): string {
  if (!ts) return "never";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 30) return "just now";
  if (sec < 90) return "1 min ago";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 7200) return "1 hour ago";
  return `${Math.floor(sec / 3600)} hours ago`;
}

export function SyncButton() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [, setTick] = useState(0); // force rerender every minute for relative time
  const inFlight = useRef(false);

  const doSync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);
    try {
      for (const entity of ENTITIES) {
        try {
          await fetch(`/api/sync?entity=${entity}`, { method: "POST" });
        } catch {
          // continue with other entities
        }
      }
      // GCal best-effort
      try { await fetch("/api/gcal/sync", { method: "POST" }); } catch {}
      // Buffer best-effort
      try { await fetch("/api/buffer/sync", { method: "POST" }); } catch {}
      // Push Notion → Buffer drafts (for content with Publish Date + Scheduled platform status)
      try { await fetch("/api/buffer/push-drafts", { method: "POST" }); } catch {}
      setLastSynced(Date.now());
      startTransition(() => router.refresh());
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }, [router]);

  // Auto-sync tick — only when tab is visible
  useEffect(() => {
    if (!autoSync || AUTO_SYNC_MINUTES <= 0) return;
    const intervalMs = AUTO_SYNC_MINUTES * 60 * 1000;
    const handle = setInterval(() => {
      if (document.visibilityState === "visible") doSync();
    }, intervalMs);
    return () => clearInterval(handle);
  }, [autoSync, doSync]);

  // Refresh the relative-time label every 30s
  useEffect(() => {
    const handle = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(handle);
  }, []);

  // Hydrate last-synced timestamp from server so the indicator persists
  // across page refreshes (server already records sync_log rows).
  useEffect(() => {
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((s) => {
        const recent = (s.recent ?? []).find((r: any) => r.finishedAt && !r.error);
        if (recent?.finishedAt) {
          const ts = new Date(recent.finishedAt).getTime();
          if (!isNaN(ts)) setLastSynced(ts);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-500 hidden sm:inline">
        Synced {relTime(lastSynced)}
      </span>
      <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoSync}
          onChange={(e) => setAutoSync(e.target.checked)}
          className="size-3.5 rounded"
        />
        Auto
      </label>
      <button
        onClick={doSync}
        disabled={running}
        className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        {running ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            Syncing…
          </>
        ) : lastSynced && Date.now() - lastSynced < 5000 ? (
          <>
            <Check className="size-4 text-green-600" />
            Synced
          </>
        ) : (
          <>
            <RefreshCw className="size-4" />
            Sync
          </>
        )}
      </button>
    </div>
  );
}
