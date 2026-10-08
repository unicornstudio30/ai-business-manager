// Data health — can the reports be trusted right now? Admin-only (/admin/*).

import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { dataHealth, type HealthLevel } from "@/lib/db/data-health";

export const dynamic = "force-dynamic";

const ICON: Record<HealthLevel, { Icon: typeof CheckCircle2; cls: string }> = {
  ok: { Icon: CheckCircle2, cls: "text-emerald-600" },
  warn: { Icon: AlertTriangle, cls: "text-amber-600" },
  error: { Icon: XCircle, cls: "text-red-600" },
};

const fmt = (d: Date | string | number | null | undefined) => {
  if (!d) return "—";
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x.getTime()) ? String(d) : x.toISOString().replace("T", " ").slice(0, 16) + " UTC";
};

export default async function DataHealthPage() {
  const h = await dataHealth();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <Activity className="size-6 text-stone-500" /> Data health
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Where PBM's numbers come from and whether they're current. PBM reads the Notion CRM and receives
          totals from the Pipeline app — only when you click Sync.
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white divide-y divide-stone-100">
        {h.checks.map((c) => {
          const { Icon, cls } = ICON[c.level];
          return (
            <div key={c.key} className="flex items-start gap-3 p-4">
              <Icon className={`size-5 shrink-0 mt-0.5 ${cls}`} />
              <div>
                <div className="text-sm font-medium text-stone-900">{c.label}</div>
                <div className="text-sm text-stone-600">{c.detail}</div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
          <div className="font-semibold text-stone-900 mb-2">Notion CRM</div>
          <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-stone-600">
            {Object.entries(h.notion.lastPull).map(([entity, p]) => (
              <div key={entity} className="contents">
                <dt>Last pull · {entity.replace("_", " ")}</dt>
                <dd className="text-right tabular-nums">{p.error ? "failed" : fmt(p.at)}</dd>
              </div>
            ))}
            <dt>Contacts in Notion</dt>
            <dd className="text-right tabular-nums">{h.contacts.inNotion}</dd>
            <dt>Removed from Notion (kept, not reported)</dt>
            <dd className="text-right tabular-nums">{h.contacts.removed}</dd>
            <dt>Without a Seat</dt>
            <dd className="text-right tabular-nums">{h.contacts.withoutSeat}</dd>
            <dt>Without a Stage</dt>
            <dd className="text-right tabular-nums">{h.contacts.withoutStage}</dd>
            <dt>Stages ({h.stages.source})</dt>
            <dd className="text-right tabular-nums">{h.stages.count}</dd>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
          <div className="font-semibold text-stone-900 mb-2">Pipeline app</div>
          {h.pipeline ? (
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-stone-600">
              <dt>Last push received</dt>
              <dd className="text-right tabular-nums">{fmt(h.pipeline.receivedAt)}</dd>
              <dt>Metrics in last push</dt>
              <dd className="text-right tabular-nums">{h.pipeline.metricCount}</dd>
              {Object.entries(h.pipeline.freshness).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>{k === "unclassified" ? "Leads waiting for the classifier" : `Newest ${k} data`}</dt>
                  <dd className="text-right tabular-nums">{typeof v === "number" ? v : fmt(v)}</dd>
                </div>
              ))}
              <dt>Notion changes awaiting review</dt>
              <dd className="text-right tabular-nums">{h.pipeline.notionWritesPending}</dd>
            </dl>
          ) : (
            <p className="text-stone-600">
              Nothing received yet. With the Pipeline app running on your Mac, click Sync (or run{" "}
              <code className="px-1 bg-stone-100 rounded">npm run pbm-push</code> in ~/crm).
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm overflow-x-auto">
        <div className="font-semibold text-stone-900 mb-2">Seats</div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-1.5 pr-2 font-medium">Seat (Notion)</th>
              <th className="py-1.5 px-2 font-medium text-right">Contacts</th>
              <th className="py-1.5 px-2 font-medium">App user</th>
              <th className="py-1.5 pl-2 font-medium">Matched by</th>
            </tr>
          </thead>
          <tbody>
            {h.seats.map((s) => (
              <tr key={s.name} className="border-t border-stone-100">
                <td className="py-1.5 pr-2">{s.name}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{s.contacts}</td>
                <td className="py-1.5 px-2">{s.user ? `${s.user.name} (${s.user.email})` : "—"}</td>
                <td className="py-1.5 pl-2">{s.matchedVia ?? "not mapped"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
        <div className="font-semibold text-stone-900 mb-2">Features</div>
        <div className="flex flex-wrap gap-2">
          {h.flags.map((f) => (
            <span
              key={f.flag}
              className={`rounded-md border px-2 py-0.5 text-xs ${
                f.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-stone-50 text-stone-500"
              }`}
            >
              {f.flag.toLowerCase().replace(/_/g, " ")}: {f.enabled ? "on" : "off"}
            </span>
          ))}
        </div>
        <p className="text-xs text-stone-500 mt-2">Change with the PBM_FLAG_&lt;NAME&gt;=on|off environment variables.</p>
      </section>
    </div>
  );
}
