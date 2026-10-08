"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";

const ENTITIES = ["contacts", "content_items", "tracker_entries"] as const;

// The Unicorn Studio Pipeline app runs on your Mac. Vercel can't reach it, but
// your browser can: after the Notion pull, Sync asks the local Pipeline server
// to push its per-seat totals to PBM. Sync only ever runs when clicked.
const PIPELINE_URL = (process.env.NEXT_PUBLIC_PIPELINE_URL ?? "http://localhost:4321").replace(/\/$/, "");

function relTime(ts: number | null): string {
  if (!ts) return "never";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 30) return "just now";
  if (sec < 90) return "1 min ago";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 7200) return "1 hour ago";
  return `${Math.floor(sec / 3600)} hours ago`;
}

type StepState = "idle" | "ok" | "failed";

export function SyncButton() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [notionState, setNotionState] = useState<StepState>("idle");
  const [pipelineState, setPipelineState] = useState<StepState>("idle");
  const [pipelineNote, setPipelineNote] = useState<string>("");
  const [, setTick] = useState(0); // force rerender every minute for relative time
  const inFlight = useRef(false);

  const doSync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);
    setNotionState("idle");
    setPipelineState("idle");
    setPipelineNote("");
    try {
      // 1) Notion → PBM (read-only pull)
      let notionOk = true;
      for (const entity of ENTITIES) {
        // A large first pull can stop at Vercel's time limit and report
        // complete: false — keep going (a few rounds) until it finishes.
        for (let round = 0; round < 4; round++) {
          try {
            const r = await fetch(`/api/sync?entity=${entity}`, { method: "POST" });
            if (!r.ok) { notionOk = false; break; }
            const j = await r.json().catch(() => ({}));
            const res = (j.results ?? [])[0];
            if (res?.error) { notionOk = false; break; }
            if (res?.complete !== false) break;
            if (round === 3) notionOk = false;
          } catch {
            notionOk = false; // continue with other entities
            break;
          }
        }
      }
      setNotionState(notionOk ? "ok" : "failed");

      // 2) Pipeline → PBM, via the local Pipeline server (numbers only)
      try {
        const r = await fetch(`${PIPELINE_URL}/api/pbm/push`, { method: "POST" });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) {
          setPipelineState("ok");
          setPipelineNote(`${j.metrics} metrics`);
        } else {
          setPipelineState("failed");
          setPipelineNote(j.error ? String(j.error).slice(0, 120) : `HTTP ${r.status}`);
        }
      } catch {
        setPipelineState("failed");
        setPipelineNote("Pipeline app not reachable — open it on this Mac, or run npm run pbm-push in ~/crm");
      }

      // ICP classify pending contacts best-effort (~10/sync, PBM's own DB)
      try { await fetch("/api/ai/classify-pending?limit=10", { method: "POST" }); } catch {}
      setLastSynced(Date.now());
      startTransition(() => router.refresh());
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }, [router]);

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

  const dot = (st: StepState) =>
    st === "ok" ? "bg-green-500" : st === "failed" ? "bg-amber-500" : "bg-stone-300";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-500 hidden sm:inline">
        Synced {relTime(lastSynced)}
      </span>
      {(notionState !== "idle" || pipelineState !== "idle") && (
        <span className="hidden md:inline-flex items-center gap-2 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1" title="Notion CRM pull">
            <span className={`size-1.5 rounded-full ${dot(notionState)}`} /> Notion
          </span>
          <span className="inline-flex items-center gap-1" title={pipelineNote || "Pipeline app push"}>
            <span className={`size-1.5 rounded-full ${dot(pipelineState)}`} /> Pipeline
          </span>
        </span>
      )}
      <button
        onClick={doSync}
        disabled={running}
        className="btn-secondary"
        title="Pull Notion and the Pipeline app into PBM. Runs only when clicked."
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
