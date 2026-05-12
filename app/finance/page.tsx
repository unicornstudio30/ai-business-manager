import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { financeSummary, revenueByMonth12 } from "@/lib/db/finance-summary";
import { fmtMoney } from "@/lib/finance";
import { NewInvoiceForm } from "@/components/finance/new-invoice-form";
import { InvoiceRow } from "@/components/finance/invoice-row";
import { RevenueChart } from "@/components/finance/revenue-chart";

export const dynamic = "force-dynamic";

function SummaryTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "green" | "red" | "amber" }) {
  const toneColor = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-stone-900";
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

export default async function FinancePage() {
  const [entries, summary, byMonth, contacts, projects] = await Promise.all([
    db.select().from(schema.financeEntries).orderBy(desc(schema.financeEntries.date)),
    financeSummary(),
    revenueByMonth12(),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
    db.select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects),
  ]);

  const contactName = new Map(contacts.map((c) => [c.id, c.name]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Finance</h1>
          <p className="text-sm text-stone-500 mt-1">
            Invoices, MRR, and revenue. {summary.invoiceCounts.total} total · {summary.invoiceCounts.outstanding} outstanding · {summary.invoiceCounts.paid} paid.
          </p>
        </div>
        <NewInvoiceForm contacts={contacts} projects={projects} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile label="This month" value={fmtMoney(summary.monthlyRevenue)} hint="Paid this month" tone="green" />
        <SummaryTile label="YTD revenue" value={fmtMoney(summary.ytdRevenue)} hint="Year to date, paid" />
        <SummaryTile label="MRR" value={fmtMoney(summary.mrr)} hint="From active project retainers" tone="green" />
        <SummaryTile label="Outstanding" value={fmtMoney(summary.outstanding)} hint={`${summary.invoiceCounts.outstanding} unpaid invoices`} tone={summary.outstanding > 0 ? "amber" : undefined} />
      </div>

      <RevenueChart data={byMonth} />

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 text-sm font-semibold text-stone-900">All invoices</div>
        {entries.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">
            No invoices yet. Click "+ New invoice" to add the first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Line item</th>
                <th className="text-left px-4 py-2.5">Client</th>
                <th className="text-left px-4 py-2.5">Project</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Paid on</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entries.map((e) => (
                <InvoiceRow
                  key={e.id}
                  entry={e}
                  contactName={e.contactId ? contactName.get(e.contactId) : null}
                  projectName={e.projectId ? projectName.get(e.projectId) : null}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
