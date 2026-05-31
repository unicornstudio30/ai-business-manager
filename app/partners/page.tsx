// /partners — Clients tab. Active partnerships pulled from the Sales CRM
// (contacts whose Status reached "Partnership"). Tracks each client's
// freshness (days since last touch) so nothing goes quietly cold.

import Link from "next/link";
import {
  Handshake,
  Search,
  ExternalLink,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Snowflake,
  Sparkles,
  Clock,
} from "lucide-react";
import { getClientsView, type ClientHealth } from "@/lib/db/clients";
import { parseJson, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; health?: string }>;
};

const HEALTH_META: Record<ClientHealth, { label: string; chip: string; dot: string }> = {
  fresh:   { label: "Fresh",    chip: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  warm:    { label: "Warm",     chip: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500" },
  cooling: { label: "Cooling",  chip: "bg-orange-100 text-orange-800 border-orange-200",    dot: "bg-orange-500" },
  cold:    { label: "Cold",     chip: "bg-rose-100 text-rose-800 border-rose-200",          dot: "bg-rose-500" },
  unknown: { label: "No touch", chip: "bg-stone-100 text-stone-700 border-stone-200",       dot: "bg-stone-400" },
};

export default async function ClientsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = sp.q?.trim() || undefined;
  const healthFilter = (sp.health as ClientHealth | undefined) || undefined;

  const data = await getClientsView(search);
  const items = healthFilter ? data.items.filter((i) => i.health === healthFilter) : data.items;

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = { q: search, health: healthFilter, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/partners?${qs}` : "/partners";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Active partnerships</div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <Handshake className="size-7 text-stone-400" /> Clients
        </h1>
        <p className="text-sm text-stone-500 mt-1 max-w-3xl">
          Contacts in your Sales CRM whose <strong>Status</strong> is <code className="px-1 bg-stone-100 rounded">Partnership</code>.
          Freshness tracks days since your last touch — re-engage before they cool off.
        </p>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile icon={<Handshake className="size-3.5" />} label="Total" value={data.totals.total} />
        <StatTile icon={<Sparkles className="size-3.5 text-emerald-700" />} label="Fresh (≤14d)" value={data.totals.fresh} tone="emerald" />
        <StatTile icon={<Clock className="size-3.5 text-amber-700" />} label="Need check-in (15-30d)" value={data.totals.needCheckIn} tone="amber" />
        <StatTile icon={<Snowflake className="size-3.5 text-rose-700" />} label="Going quiet (30d+)" value={data.totals.goingQuiet} tone="rose" />
        <StatTile icon={<CheckCircle2 className="size-3.5" />} label="+30d new" value={data.totals.newLast30Days} />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form action="/partners" method="GET" className="flex items-center gap-2">
          {healthFilter && <input type="hidden" name="health" value={healthFilter} />}
          <div className="relative">
            <Search className="size-3.5 absolute left-2 top-2.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={search ?? ""}
              placeholder="Search clients by name…"
              className="rounded-lg border border-stone-300 bg-white pl-7 pr-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 w-64"
            />
          </div>
          {(search || healthFilter) && (
            <Link href="/partners" className="text-xs text-stone-500 hover:text-stone-800">
              clear all
            </Link>
          )}
        </form>

        {/* Health pill row */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <span className="text-[10px] uppercase tracking-wide text-stone-400 mr-1">Health:</span>
          {(["fresh", "warm", "cooling", "cold", "unknown"] as ClientHealth[]).map((h) => {
            const isOn = healthFilter === h;
            const m = HEALTH_META[h];
            return (
              <Link
                key={h}
                href={buildUrl({ health: isOn ? undefined : h })}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                  isOn ? m.chip : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </div>

        <span className="text-xs text-stone-500 tabular-nums">
          {items.length} client{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Empty / populated state */}
      {data.totals.total === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Handshake className="size-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-700 font-medium mb-1">No clients yet</p>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            In your Notion CRM, set a contact's <strong>Status</strong> column to{" "}
            <code className="px-1 bg-stone-100 rounded">Partnership</code>{" "}
            after you close the deal. They'll appear here so you can track follow-ups + stay top-of-mind.
          </p>
          <Link
            href="/settings"
            className="inline-block mt-3 text-xs text-stone-700 underline"
          >
            Open Settings to trigger a sync
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-stone-500">
          No clients match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((i) => {
            const c = i.contact;
            const meta = HEALTH_META[i.health];
            const positionArr = parseJson<string[]>(c.position, []);
            const professionArr = parseJson<string[]>(c.profession, []);
            const subtitle = [
              positionArr.length > 0 ? positionArr.join(" / ") : null,
              professionArr.length > 0 ? professionArr.join(" · ") : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="surface surface-hover p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${meta.dot}`} />
                      <span className="text-sm font-semibold text-stone-900 truncate">
                        {c.name || "(no name)"}
                      </span>
                    </div>
                    {subtitle && (
                      <div className="text-xs text-stone-500 truncate mt-0.5">{subtitle}</div>
                    )}
                  </div>
                  {i.notionUrl && (
                    <a
                      href={i.notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-stone-900 flex-shrink-0"
                      title="Open in Notion"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium border ${meta.chip}`}>
                    {meta.label}
                  </span>
                  {c.platform && (
                    <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-stone-100 text-stone-700 border border-stone-200">
                      {c.platform}
                    </span>
                  )}
                  {c.country && (
                    <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-stone-100 text-stone-700 border border-stone-200">
                      {c.country}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    Client {i.daysAsClient !== null ? `${i.daysAsClient}d` : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    Last touch:{" "}
                    {i.daysSinceTouch === null ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <span className={
                        i.daysSinceTouch <= 14 ? "text-emerald-700"
                        : i.daysSinceTouch <= 30 ? "text-amber-700"
                        : i.daysSinceTouch <= 90 ? "text-orange-700"
                        : "text-rose-700"
                      }>
                        {i.daysSinceTouch}d
                      </span>
                    )}
                  </span>
                </div>

                {c.followUpDate && (
                  <div className="text-[11px] text-stone-500 flex items-center gap-1">
                    <AlertCircle className="size-3" /> Next follow-up {fmtDate(c.followUpDate)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "amber" | "emerald" | "rose";
}) {
  const valColor =
    tone === "amber" ? "text-amber-700"
    : tone === "emerald" ? "text-emerald-700"
    : tone === "rose" ? "text-rose-700"
    : "text-stone-900";
  return (
    <div className="surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-500 mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${valColor}`}>{value}</div>
    </div>
  );
}
