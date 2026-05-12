// Finance analytics — computed from projects, not invoices.
// User decided to track invoices in a separate tool (Notion/Wave/etc.).
// Web app surfaces revenue + MRR + pipeline from project data only.

import { db, schema } from "./client";

const REALIZED_STATUSES = new Set(["Delivered", "Maintenance", "Closed"]);
const PIPELINE_STATUSES = new Set(["Briefing", "Building", "QA"]);

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

  const projects = await db.select().from(schema.projects);

  // MRR = sum of monthlyRetainer for non-Closed projects with retainer > 0
  const mrr = projects
    .filter((p) => p.status !== "Closed" && p.monthlyRetainer && p.monthlyRetainer > 0)
    .reduce((s, p) => s + (p.monthlyRetainer ?? 0), 0);

  // Pipeline value = sum of price for projects in Briefing/Building/QA
  const pipelineValue = projects
    .filter((p) => p.status && PIPELINE_STATUSES.has(p.status))
    .reduce((s, p) => s + (p.price ?? 0), 0);

  // Realized YTD: sum of price where realized status AND dueDate this year.
  // Use dueDate as a proxy for "when revenue was recognized" since projects
  // don't carry a separate delivered_at column.
  const realizedYTD = projects
    .filter(
      (p) =>
        p.status &&
        REALIZED_STATUSES.has(p.status) &&
        p.dueDate &&
        p.dueDate >= yearStart
    )
    .reduce((s, p) => s + (p.price ?? 0), 0);

  // Realized this month
  const realizedThisMonth = projects
    .filter(
      (p) =>
        p.status &&
        REALIZED_STATUSES.has(p.status) &&
        p.dueDate &&
        p.dueDate >= monthStart &&
        p.dueDate < monthEnd
    )
    .reduce((s, p) => s + (p.price ?? 0), 0);

  const counts = {
    total: projects.length,
    pipeline: projects.filter((p) => p.status && PIPELINE_STATUSES.has(p.status)).length,
    delivered: projects.filter((p) => p.status === "Delivered").length,
    activeRetainers: projects.filter((p) => p.status !== "Closed" && (p.monthlyRetainer ?? 0) > 0).length,
  };

  return { mrr, pipelineValue, realizedYTD, realizedThisMonth, counts };
}

// Last 12 months — sum of price where project realized in that month.
export async function revenueByMonth12() {
  const projects = await db.select().from(schema.projects);
  const realized = projects.filter(
    (p) => p.status && REALIZED_STATUSES.has(p.status) && p.dueDate
  );

  const out: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const sum = realized
      .filter((p) => p.dueDate && p.dueDate >= start && p.dueDate < end)
      .reduce((s, p) => s + (p.price ?? 0), 0);
    out.push({ month: start.toLocaleString("en-US", { month: "short" }), revenue: sum });
  }
  return out;
}
