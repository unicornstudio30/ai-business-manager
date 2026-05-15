// Daily KPI helpers: read today + 7-day window, auto-suggest counts
// from activities (so the user doesn't have to manually count).

import { db, schema } from "./client";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}

// Counts from activities for a single day, mapped to KPI columns.
// These are SUGGESTIONS — the user can override. We don't auto-write.
export async function suggestedCountsForDate(date: Date) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  const rows = await db
    .select({ type: schema.activities.type, count: sql<number>`count(*)` })
    .from(schema.activities)
    .where(and(gte(schema.activities.createdAt, start), lt(schema.activities.createdAt, end)))
    .groupBy(schema.activities.type);

  const counts = new Map(rows.map((r) => [r.type, Number(r.count)]));
  return {
    coldDmsSent: counts.get("dm_sent") ?? 0,
    coldEmailsSent: counts.get("email_drafted") ?? 0,
    followUpsSent: counts.get("follow_up_sent") ?? 0,
    commentsOnProspects: counts.get("comment_drafted") ?? 0,
    warmDmsSent: 0,
    responses: 0,
    callsBooked: 0,
    newProspects: 0,
    inboundLeads: 0,
  };
}

export async function get7DaysOfKpis() {
  const days: { date: Date; row: typeof schema.dailySalesKpis.$inferSelect | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date(Date.now() - i * 86400000));
    const r = await db
      .select()
      .from(schema.dailySalesKpis)
      .where(eq(schema.dailySalesKpis.date, d))
      .limit(1);
    days.push({ date: d, row: r[0] ?? null });
  }
  return days;
}

export async function getKpiByDate(date: Date) {
  const d = startOfDay(date);
  const rows = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(eq(schema.dailySalesKpis.date, d))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertKpi(date: Date, fields: Partial<typeof schema.dailySalesKpis.$inferInsert>) {
  const d = startOfDay(date);
  const existing = await getKpiByDate(d);
  if (existing) {
    const [updated] = await db
      .update(schema.dailySalesKpis)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(schema.dailySalesKpis.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.dailySalesKpis)
    .values({ date: d, ...fields })
    .returning();
  return created;
}
