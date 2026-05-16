import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { financeSummary, revenueByMonth12 } from "@/lib/db/finance-summary";
import { revenueBySource, type SourceRevenueRow } from "@/lib/db/revenue-by-source";
import { fmtMoney } from "@/lib/finance";
import { fmtDate } from "@/lib/utils";
import { PROJECT_STATUS_COLORS, SERVICE_LINE_COLORS, type ProjectStatus, type ServiceLine } from "@/lib/projects";
import { RevenueChart } from "@/components/finance/revenue-chart";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

function SummaryTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "green" | "amber" }) {
  const toneColor = tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-stone-900";
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

export default async function FinancePage() {
  const [projects, summary, byMonth, contacts, bySource] = await Promise.all([
    db.select().from(schema.projects).orderBy(desc(schema.projects.dueDate)),
    financeSummary(),
    revenueByMonth12(),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
    revenueBySource(),
  ]);

  const contactName = new Map(contacts.map((c) => [c.id, c.name]));

  const pipeline = projects.filter((p) => p.status && ["Briefing", "Building", "QA"].includes(p.status));
  const retainers = projects.filter((p) => p.status !== "Closed" && (p.monthlyRetainer ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Finance</h1>
        <p className="text-sm text-stone-500 mt-1">
          Revenue, MRR, and pipeline value — computed from your projects. Track invoices in your accounting tool of choice.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile label="MRR" value={fmtMoney(summary.mrr)} hint={`${summary.counts.activeRetainers} active retainer${summary.counts.activeRetainers === 1 ? "" : "s"}`} tone="green" />
        <SummaryTile label="Pipeline value" value={fmtMoney(summary.pipelineValue)} hint={`${summary.counts.pipeline} active build${summary.counts.pipeline === 1 ? "" : "s"}`} />
        <SummaryTile label="Realized this month" value={fmtMoney(summary.realizedThisMonth)} hint="Delivered/Maintenance/Closed this month" tone="green" />
        <SummaryTile label="Realized YTD" value={fmtMoney(summary.realizedYTD)} hint="Year to date" />
      </div>

      <RevenueChart data={byMonth} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelinePanel projects={pipeline} contactName={contactName} />
        <RetainersPanel projects={retainers} contactName={contactName} />
      </div>

      <RevenueBySourcePanel rows={bySource} />
    </div>
  );
}

function RevenueBySourcePanel({ rows }: { rows: SourceRevenueRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  const attributed = rows.filter((r) => r.contentId !== null);
  const totalAttributedAnnual = attributed.reduce(
    (s, r) => s + r.totalPrice + r.totalMonthlyRetainer * 12,
    0
  );
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Megaphone className="size-4 text-stone-400" /> Revenue by content source
        </h2>
        <span className="text-xs text-stone-500">
          {attributed.length} attributed source{attributed.length === 1 ? "" : "s"} · {fmtMoney(totalAttributedAnnual)} annualized
        </span>
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Which content piece originally brought each contact in. Set the source on any contact page (drop-down at the top of the profile).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-stone-500">
            <tr className="border-b border-stone-100">
              <th className="text-left py-2 font-medium">Content source</th>
              <th className="text-right py-2 font-medium">Contacts</th>
              <th className="text-right py-2 font-medium">Projects</th>
              <th className="text-right py-2 font-medium">One-time</th>
              <th className="text-right py-2 font-medium">MRR</th>
              <th className="text-right py-2 font-medium">12-mo total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => {
              const annual = r.totalPrice + r.totalMonthlyRetainer * 12;
              return (
                <tr key={r.contentId ?? "__none__"} className="hover:bg-stone-50">
                  <td className="py-2.5">
                    {r.contentId ? (
                      <span className="text-stone-800">{r.contentTitle || "(untitled)"}</span>
                    ) : (
                      <span className="text-stone-400 italic">— unattributed —</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-stone-700 tabular-nums">{r.contactCount}</td>
                  <td className="py-2.5 text-right text-stone-700 tabular-nums">{r.projectCount}</td>
                  <td className="py-2.5 text-right text-stone-700 tabular-nums">{fmtMoney(r.totalPrice)}</td>
                  <td className="py-2.5 text-right text-green-700 tabular-nums">{fmtMoney(r.totalMonthlyRetainer)}/mo</td>
                  <td className="py-2.5 text-right font-semibold text-stone-900 tabular-nums">{fmtMoney(annual)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PipelinePanel({ projects, contactName }: { projects: any[]; contactName: Map<string, string> }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-stone-900">Pipeline projects</h2>
        <span className="text-xs text-stone-500">{projects.length} active builds</span>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
          No active builds. Create a project to see it here.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex-1 min-w-0">
                <Link href={`/projects/${p.id}`} className="text-sm font-medium text-stone-900 hover:underline truncate block">
                  {p.name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  {p.status && (
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 ${PROJECT_STATUS_COLORS[p.status as ProjectStatus]}`}>
                      {p.status}
                    </span>
                  )}
                  {p.serviceLine && (
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 ${SERVICE_LINE_COLORS[p.serviceLine as ServiceLine]}`}>
                      {p.serviceLine}
                    </span>
                  )}
                  {p.contactId && contactName.get(p.contactId) && (
                    <span className="text-stone-400">· {contactName.get(p.contactId)}</span>
                  )}
                  {p.dueDate && <span className="text-stone-400">· due {fmtDate(p.dueDate)}</span>}
                </div>
              </div>
              <div className="text-sm font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                {fmtMoney(p.price)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RetainersPanel({ projects, contactName }: { projects: any[]; contactName: Map<string, string> }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-stone-900">Active retainers</h2>
        <span className="text-xs text-stone-500">{projects.length} contributing to MRR</span>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
          No active retainers. Add a monthly retainer to a project to see it here.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex-1 min-w-0">
                <Link href={`/projects/${p.id}`} className="text-sm font-medium text-stone-900 hover:underline truncate block">
                  {p.name}
                </Link>
                <div className="text-xs text-stone-400 mt-0.5">
                  {p.contactId && contactName.get(p.contactId) ? contactName.get(p.contactId) : "(no contact)"}
                  {p.status && ` · ${p.status}`}
                </div>
              </div>
              <div className="text-sm font-semibold text-green-700 tabular-nums whitespace-nowrap">
                {fmtMoney(p.monthlyRetainer)}/mo
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
