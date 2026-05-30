// /networking — the PRM (Personal Relationship Manager) list view.
// Sources contacts from the Notion PRM database the user connected in /settings.
// Each row links to /networking/[id] for detail + the Write Message wizard.

import Link from "next/link";
import { Search, Network, ExternalLink, AlertCircle, Calendar } from "lucide-react";
import { listNetworkingContacts, getNetworkingStats } from "@/lib/db/networking-contacts";
import { getPrmConfig } from "@/lib/notion/prm-config";
import { PrmSyncButton } from "@/components/networking/sync-button";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; stage?: string; rel?: string }>;
};

export default async function NetworkingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = sp.q?.trim() || undefined;
  const stage = sp.stage || undefined;
  const relationship = sp.rel || undefined;

  const [contacts, stats, prmCfg] = await Promise.all([
    listNetworkingContacts({ search, stage, relationship, limit: 200 }),
    getNetworkingStats(),
    getPrmConfig(),
  ]);

  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: search,
      stage,
      rel: relationship,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/networking?${qs}` : "/networking";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
            Personal Relationship Manager
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
            <Network className="size-7 text-stone-400" /> Networking
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Friends, peers, advisors, partners. Sourced from your Notion PRM. Use the
            Write Message wizard on any contact to draft a personalized outreach in seconds.
          </p>
        </div>
        {prmCfg && <PrmSyncButton />}
      </div>

      {!prmCfg && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 mb-2">
            <AlertCircle className="size-4" /> Notion PRM not connected
          </div>
          <p className="text-sm text-amber-800 mb-3">
            Connect your Notion Personal Relationship Manager database in{" "}
            <Link href="/settings" className="font-medium underline">
              Settings
            </Link>{" "}
            to start syncing networking contacts.
          </p>
          <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
            <li>Open your PRM database in Notion.</li>
            <li>Click <strong>⋯</strong> → <strong>Add connections</strong> → Unicorn Studio Business Manager.</li>
            <li>Paste the URL into Settings → Networking PRM database.</li>
          </ol>
        </div>
      )}

      {prmCfg && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Total contacts" value={stats.total} />
            <StatTile label="Overdue follow-ups" value={stats.overdueFollowUps} tone="amber" />
            <StatTile label="Stages" value={stats.byStage.length} />
            <StatTile label="Relationships" value={stats.byRelationship.length} />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <form action="/networking" method="GET" className="flex items-center gap-2">
              {stage && <input type="hidden" name="stage" value={stage} />}
              {relationship && <input type="hidden" name="rel" value={relationship} />}
              <div className="relative">
                <Search className="size-3.5 absolute left-2 top-2.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  name="q"
                  defaultValue={search ?? ""}
                  placeholder="Search by name, company, profession…"
                  className="rounded-lg border border-stone-300 bg-white pl-7 pr-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 w-72"
                />
              </div>
              {(search || stage || relationship) && (
                <Link href="/networking" className="text-xs text-stone-500 hover:text-stone-800">
                  clear all
                </Link>
              )}
            </form>
            <span className="ml-auto text-xs text-stone-500 tabular-nums">
              {contacts.length} contact{contacts.length === 1 ? "" : "s"}
            </span>
          </div>

          {stats.byStage.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-stone-400 mr-1">Stage:</span>
              {stats.byStage.map((s) => {
                const isOn = stage === s.stage;
                return (
                  <Link
                    key={s.stage}
                    href={buildUrl({ stage: isOn ? undefined : s.stage })}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                      isOn
                        ? "bg-violet-100 text-violet-800 border-violet-200"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    {s.stage} <span className="opacity-60">({s.count})</span>
                  </Link>
                );
              })}
            </div>
          )}

          {stats.byRelationship.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 -mt-2">
              <span className="text-[10px] uppercase tracking-wide text-stone-400 mr-1">Relationship:</span>
              {stats.byRelationship.map((r) => {
                const isOn = relationship === r.relationship;
                return (
                  <Link
                    key={r.relationship}
                    href={buildUrl({ rel: isOn ? undefined : r.relationship })}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                      isOn
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    {r.relationship} <span className="opacity-60">({r.count})</span>
                  </Link>
                );
              })}
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="surface p-12 text-center">
              {stats.total === 0 ? (
                <>
                  <p className="text-sm text-stone-600 mb-1">No contacts synced yet.</p>
                  <p className="text-xs text-stone-500">
                    Click <strong>Sync from Notion</strong> above to pull your PRM contacts.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-stone-600 mb-1">No contacts match these filters.</p>
                  <p className="text-xs text-stone-500">Clear filters or try a different search.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((c) => {
                const overdue =
                  c.nextFollowUpAt && c.nextFollowUpAt.getTime() <= Date.now();
                const notionUrl = c.notionPageId
                  ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`
                  : null;
                return (
                  <Link
                    key={c.id}
                    href={`/networking/${c.id}`}
                    className="surface surface-hover p-4 flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-stone-900 truncate">
                          {c.name || "(no name)"}
                        </div>
                        {(c.role || c.company) && (
                          <div className="text-xs text-stone-500 truncate">
                            {[c.role, c.company].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      {notionUrl && (
                        <a
                          href={notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-stone-400 hover:text-stone-900 flex-shrink-0"
                          title="Open in Notion"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {c.relationship && (
                        <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
                          {c.relationship}
                        </span>
                      )}
                      {c.stage && (
                        <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-violet-50 text-violet-800 border border-violet-200">
                          {c.stage}
                        </span>
                      )}
                      {c.platform && (
                        <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-stone-100 text-stone-700 border border-stone-200">
                          {c.platform}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Last: {fmtDate(c.lastContactAt) || "—"}
                      </span>
                      {c.nextFollowUpAt && (
                        <span className={overdue ? "text-amber-700 font-semibold" : ""}>
                          Next: {fmtDate(c.nextFollowUpAt)}
                          {overdue && " · overdue"}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  const valColor = tone === "amber" ? "text-amber-700" : "text-stone-900";
  return (
    <div className="surface p-3">
      <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${valColor}`}>{value}</div>
    </div>
  );
}
