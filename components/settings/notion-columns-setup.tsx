"use client";

import { useState } from "react";
import { Wand2, Check, AlertCircle } from "lucide-react";

export function NotionColumnsSetup() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ added?: string[]; existed?: string[]; error?: string } | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup-notion", { method: "POST" });
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setResult({ error: e?.message || "Network error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="text-sm font-semibold text-stone-900 mb-1 flex items-center gap-2">
        <Wand2 className="size-4 text-violet-500" /> Notion CRM columns
      </div>
      <p className="text-sm text-stone-600 leading-relaxed mb-3">
        Adds 3 web-app-managed columns to your Sales CRM in Notion so computed
        data (lead score, win/loss reasons, audit summaries) flows back into
        Notion automatically. Idempotent — safe to run multiple times.
      </p>
      <ul className="text-xs text-stone-500 mb-4 list-disc list-inside space-y-0.5">
        <li><code className="px-1 bg-stone-100 rounded">Lead Score</code> (number) — pushed when score changes</li>
        <li><code className="px-1 bg-stone-100 rounded">Closed Reason</code> (text) — pushed when you fill it in /wins-losses</li>
        <li><code className="px-1 bg-stone-100 rounded">Latest Audit</code> (text) — pushed when /audit runs against a contact</li>
      </ul>
      <button
        onClick={run}
        disabled={running}
        className="flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {running ? "Setting up…" : "Add columns to Notion"}
      </button>

      {result && !result.error && (
        <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-900">
          <div className="flex items-center gap-1 font-medium mb-0.5">
            <Check className="size-4" /> Done
          </div>
          {result.added && result.added.length > 0 && (
            <div>Added: <code>{result.added.join(", ")}</code></div>
          )}
          {result.existed && result.existed.length > 0 && (
            <div className="text-green-700">Already present: <code>{result.existed.join(", ")}</code></div>
          )}
          {result.added?.length === 0 && result.existed?.length === 0 && (
            <div>Nothing to do.</div>
          )}
        </div>
      )}
      {result?.error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <div className="flex items-center gap-1 font-medium mb-0.5">
            <AlertCircle className="size-4" /> Failed
          </div>
          <div className="text-xs">{result.error}</div>
        </div>
      )}
    </section>
  );
}
