// Finance summary aggregations.

import { db, schema } from "./client";
import { gte, lt, and, eq, sql } from "drizzle-orm";

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function nextMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
function startOfYear(d = new Date()): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export async function financeSummary() {
  const monthStart = startOfMonth();
  const monthEnd = nextMonth();
  const yearStart = startOfYear();

  // All entries (for totals + recent invoices)
  const all = await db.select().from(schema.financeEntries);

  // By status totals
  const byStatus = { draft: 0, sent: 0, paid: 0, overdue: 0 };
  for (const e of all) {
    const s = (e.status as keyof typeof byStatus) ?? "draft";
    if (byStatus[s] !== undefined) byStatus[s] += e.amount ?? 0;
  }

  // This month: paid invoices count + sum
  const thisMonthPaid = all.filter(
    (e) => e.status === "paid" &&
      e.paymentDate && e.paymentDate >= monthStart && e.paymentDate < monthEnd
  );
  const monthlyRevenue = thisMonthPaid.reduce((s, e) => s + (e.amount ?? 0), 0);

  // YTD paid revenue
  const ytdPaid = all.filter(
    (e) => e.status === "paid" && e.paymentDate && e.paymentDate >= yearStart
  );
  const ytdRevenue = ytdPaid.reduce((s, e) => s + (e.amount ?? 0), 0);

  // Outstanding = sent + overdue
  const outstanding = byStatus.sent + byStatus.overdue;

  // MRR from projects.monthlyRetainer where status != Closed
  const activeProjects = await db
    .select({
      monthlyRetainer: schema.projects.monthlyRetainer,
      status: schema.projects.status,
    })
    .from(schema.projects);
  const mrr = activeProjects
    .filter((p) => p.status !== "Closed" && p.monthlyRetainer && p.monthlyRetainer > 0)
    .reduce((s, p) => s + (p.monthlyRetainer ?? 0), 0);

  return {
    monthlyRevenue,
    ytdRevenue,
    outstanding,
    mrr,
    byStatus,
    invoiceCounts: {
      total: all.length,
      paid: all.filter((e) => e.status === "paid").length,
      outstanding: all.filter((e) => e.status === "sent" || e.status === "overdue").length,
    },
  };
}

// Last 12 months of paid revenue for a sparkline.
export async function revenueByMonth12() {
  const out: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const rows = await db
      .select({ amount: schema.financeEntries.amount })
      .from(schema.financeEntries)
      .where(
        and(
          eq(schema.financeEntries.status, "paid"),
          gte(schema.financeEntries.paymentDate, start),
          lt(schema.financeEntries.paymentDate, end)
        )
      );
    out.push({
      month: start.toLocaleString("en-US", { month: "short" }),
      revenue: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
    });
  }
  return out;
}
