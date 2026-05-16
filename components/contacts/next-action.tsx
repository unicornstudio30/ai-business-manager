"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

type State =
  | { status: "loading" }
  | { status: "ok"; text: string; cached: boolean }
  | { status: "error"; error: string }
  | { status: "not_configured" };

export function NextAction({ contactId }: { contactId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/ai/next-action?contact_id=${contactId}`)
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (json.ok) setState({ status: "ok", text: json.text, cached: json.cached });
        else if (json.error?.includes("OPENROUTER_API_KEY")) setState({ status: "not_configured" });
        else setState({ status: "error", error: json.error || "Unknown" });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", error: String(err) });
      });
    return () => { cancelled = true; };
  }, [contactId, refreshKey]);

  if (state.status === "not_configured") return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-3.5 text-violet-600" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
          AI suggested next action
        </span>
        {state.status === "ok" && (
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="ml-auto text-[11px] text-violet-600 hover:text-violet-800"
            title="Regenerate"
          >
            <RefreshCw className="size-3" />
          </button>
        )}
      </div>
      {state.status === "loading" && <div className="text-sm text-stone-400">Thinking…</div>}
      {state.status === "ok" && (
        <div className="text-sm text-stone-800">
          {state.text}
          {state.cached && <span className="ml-1 text-[10px] text-violet-400">(cached)</span>}
        </div>
      )}
      {state.status === "error" && <div className="text-sm text-red-700">⚠ {state.error}</div>}
    </div>
  );
}
