"use client";

import { useState } from "react";
import { Wand2, Check, AlertCircle } from "lucide-react";

type Result = { added?: string[]; existed?: string[]; error?: string; mergedTypeOptions?: string[] };

export function NotionColumnsSetup() {
  const [runningCrm, setRunningCrm] = useState(false);
  const [runningContent, setRunningContent] = useState(false);
  const [crmResult, setCrmResult] = useState<Result | null>(null);
  const [contentResult, setContentResult] = useState<Result | null>(null);

  async function run(target: "crm" | "content") {
    if (target === "crm") setRunningCrm(true); else setRunningContent(true);
    const setter = target === "crm" ? setCrmResult : setContentResult;
    setter(null);
    try {
      const res = await fetch(`/api/setup-notion?target=${target}`, { method: "POST" });
      const json = await res.json();
      setter(json);
    } catch (e: any) {
      setter({ error: e?.message || "Network error" });
    } finally {
      if (target === "crm") setRunningCrm(false); else setRunningContent(false);
    }
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 flex flex-col gap-6">
      <div>
        <div className="text-sm font-semibold text-stone-900 mb-1 flex items-center gap-2">
          <Wand2 className="size-4 text-violet-500" /> Notion CRM columns
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mb-3">
          Adds a web-app-managed column to your Sales CRM in Notion so win/loss
          reasons flow back into Notion automatically. Idempotent.
        </p>
        <ul className="text-xs text-stone-500 mb-4 list-disc list-inside space-y-0.5">
          <li><code className="px-1 bg-stone-100 rounded">Closed Reason</code> (text) — pushed when you fill it in /wins-losses</li>
        </ul>
        <button
          onClick={() => run("crm")}
          disabled={runningCrm}
          className="flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {runningCrm ? "Setting up…" : "Add columns to Sales CRM"}
        </button>
        <ResultBanner result={crmResult} />
      </div>

      <div className="border-t border-stone-100 pt-6">
        <div className="text-sm font-semibold text-stone-900 mb-1 flex items-center gap-2">
          <Wand2 className="size-4 text-amber-500" /> Notion Content Calendar Type column
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mb-3">
          Ensures the Content Calendar has a <code className="px-1 bg-stone-100 rounded">Type</code> select
          column, and populates it with every value the Market or Die log modal
          uses (Post, Video, Short, Story, Carousel, Blog post, Newsletter,
          Podcast episode, Comment, Reply, Outbound DM, Channel setup, Lead
          magnet, Live/webinar, Other). Existing options are preserved.
        </p>
        <button
          onClick={() => run("content")}
          disabled={runningContent}
          className="flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {runningContent ? "Setting up…" : "Sync Type items to Notion"}
        </button>
        <ResultBanner result={contentResult} showMergedOptions />
      </div>
    </section>
  );
}

function ResultBanner({ result, showMergedOptions }: { result: Result | null; showMergedOptions?: boolean }) {
  if (!result) return null;
  if (result.error) {
    return (
      <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
        <div className="flex items-center gap-1 font-medium mb-0.5">
          <AlertCircle className="size-4" /> Failed
        </div>
        <div className="text-xs">{result.error}</div>
      </div>
    );
  }
  return (
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
      {result.added?.length === 0 && result.existed?.length === 0 && <div>Nothing to do.</div>}
      {showMergedOptions && result.mergedTypeOptions && (
        <div className="mt-1 text-xs text-green-700">
          Type options in Notion now: <code>{result.mergedTypeOptions.join(", ")}</code>
        </div>
      )}
    </div>
  );
}
