import Link from "next/link";
import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { financeSummary, revenueByMonth12 } from "@/lib/db/finance-summary";
import { fmtMoney } from "@/lib/finance";
import { fmtDate } from "@/lib/utils";
import { PROJECT_STATUS_COLORS, SERVICE_LINE_COLORS, type ProjectStatus, type ServiceLine } from "@/lib/projects";
import { RevenueChart } from "@/components/finance/revenue-chart";

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
  const [projects, summary, byMonth, contacts] = await Promise.all([
    db.select().from(schema.projects).orderBy(desc(schema.projects.dueDate)),
    financeSummary(),
    revenueByMonth12(),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
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
    </div>
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
