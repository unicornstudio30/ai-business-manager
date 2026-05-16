"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

type SummaryState =
  | { status: "loading" }
  | { status: "ok"; text: string; cached: boolean; activityCount: number }
  | { status: "error"; error: string }
  | { status: "not_configured" };

export function DailySummary() {
  const [state, setState] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/daily-summary")
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (json.ok) {
          setState({ status: "ok", text: json.summary, cached: json.cached, activityCount: json.activityCount });
        } else if (json.error?.includes("OPENROUTER_API_KEY")) {
          setState({ status: "not_configured" });
        } else {
          setState({ status: "error", error: json.error || "Unknown error" });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "not_configured") return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-violet-600" />
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Today's briefing
        </span>
        {state.status === "ok" && (
          <span className="ml-auto text-[11px] text-stone-400">
            {state.cached ? "cached" : "fresh"} · {state.activityCount} activities
          </span>
        )}
      </div>
      {state.status === "loading" && (
        <div className="text-sm text-stone-400">Generating…</div>
      )}
      {state.status === "ok" && (
        <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
          {state.text}
        </div>
      )}
      {state.status === "error" && (
        <div className="text-sm text-red-700">⚠ {state.error}</div>
      )}
    </div>
  );
}
