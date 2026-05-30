"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function PrmSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  function sync() {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/networking/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setStatus({ kind: "err", msg: data?.error || `HTTP ${res.status}` });
          return;
        }
        const parts = [
          `${data.pulled} pulled`,
          data.inserted > 0 && `${data.inserted} new`,
          data.updated > 0 && `${data.updated} updated`,
        ].filter(Boolean);
        setStatus({ kind: "ok", msg: parts.join(" · ") });
        router.refresh();
      } catch (e: any) {
        setStatus({ kind: "err", msg: e?.message ?? "Sync failed" });
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Syncing…" : "Sync from Notion"}
      </button>
      {status?.kind === "ok" && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="size-3.5" /> {status.msg}
        </span>
      )}
      {status?.kind === "err" && (
        <span className="inline-flex items-center gap-1 text-xs text-red-700">
          <AlertCircle className="size-3.5" /> {status.msg}
        </span>
      )}
    </div>
  );
}
