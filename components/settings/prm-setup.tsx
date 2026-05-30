"use client";

// Settings section: connect the Notion PRM (Personal Relationship Manager) database.
// The user pastes the URL of their PRM database in Notion. We extract the database id,
// discover the v5 data source id, and save both. From then on the /networking pages
// + sync read against this database.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Plug, Link as LinkIcon } from "lucide-react";

type Props = {
  initial: { configured: boolean; databaseId?: string; dataSourceId?: string | null; rawUrl?: string };
};

export function PrmSetup({ initial }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(initial.rawUrl ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const configured = initial.configured;

  function connect() {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/networking/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus({ kind: "err", msg: data?.error || `HTTP ${res.status}` });
          return;
        }
        setStatus({ kind: "ok", msg: `Connected. Database ${data.databaseId.slice(0, 8)}… is ready to sync.` });
        router.refresh();
      } catch (e: any) {
        setStatus({ kind: "err", msg: e?.message ?? "Connect failed" });
      }
    });
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Plug className="size-4 text-stone-400" /> Networking PRM database
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Connect your Notion Personal Relationship Manager — the database where you save networking
            contacts via the "Save to Notion" extension. The Networking tab and Write Message wizard
            read from this database.
          </p>
        </div>
        {configured ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="size-3.5" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="size-3.5" /> Not connected
          </span>
        )}
      </div>

      {!configured && (
        <div className="rounded-lg bg-stone-50 p-4 text-xs text-stone-600 leading-relaxed mb-3">
          <div className="font-medium text-stone-800 mb-1">Steps:</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open the PRM database in Notion.</li>
            <li>Click the <strong>⋯</strong> menu (top-right) → <strong>Add connections</strong> → select <strong>Unicorn Studio Business Manager</strong>.</li>
            <li>Copy this page's URL from the address bar and paste below.</li>
          </ol>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="size-3.5 absolute left-2.5 top-2.5 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.notion.so/workspace/your-prm-database-id?v=..."
            className="w-full rounded-md border border-stone-300 pl-8 pr-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
          />
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={pending || !url.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Connecting…" : configured ? "Reconnect" : "Connect"}
        </button>
      </div>

      {configured && initial.databaseId && (
        <div className="mt-3 text-[11px] text-stone-500">
          Database: <code className="px-1 bg-stone-100 rounded">{initial.databaseId}</code>
          {initial.dataSourceId && (
            <>
              {" "}· Data source: <code className="px-1 bg-stone-100 rounded">{initial.dataSourceId.slice(0, 12)}…</code>
            </>
          )}
        </div>
      )}

      {status?.kind === "ok" && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="size-3.5" /> {status.msg}
        </div>
      )}
      {status?.kind === "err" && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-red-700">
          <AlertCircle className="size-3.5" /> {status.msg}
        </div>
      )}
    </section>
  );
}
