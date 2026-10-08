// Analytics queries for the dashboard charts.
// All pure SQL — no recompute required.
//
// Every query takes an optional `seat` (a Notion "Person" value, see
// lib/db/seats.ts). With a seat, only contacts owned by that seat count, and
// activities count only when they belong to one of those contacts.

import { db, schema } from "./client";
import { and, eq, gte, sql } from "drizzle-orm";
import { FUNNEL_GROUPS, type StageGroup } from "../stage-config";
import { stageGroup } from "../stages";

export type SeatFilter = { seat?: string | null };

// Funnel: count per dashboard-group, in order (Cold → Engaged → ... → Won).
export async function funnelCounts(opts: SeatFilter = {}): Promise<{ group: StageGroup; count: number }[]> {
  const rows = await db
    .select({
      status: schema.contacts.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .where(opts.seat ? eq(schema.contacts.ownerName, opts.seat) : undefined)
    .groupBy(schema.contacts.status);
  const byGroup = new Map<StageGroup, number>();
  for (const r of rows) {
    const g = stageGroup(r.status);
    if (g) byGroup.set(g, (byGroup.get(g) ?? 0) + Number(r.count));
  }
  return FUNNEL_GROUPS.map((group) => ({ group, count: byGroup.get(group) ?? 0 }));
}

// Activity trend: count per day, last 30 days.
export async function activityTrend30d(opts: SeatFilter = {}) {
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 29);
  thirty.setHours(0, 0, 0, 0);

  const rows = opts.seat
    ? await db
        .select({ createdAt: schema.activities.createdAt, type: schema.activities.type })
        .from(schema.activities)
        .innerJoin(schema.contacts, eq(schema.activities.contactId, schema.contacts.id))
        .where(and(gte(schema.activities.createdAt, thirty), eq(schema.contacts.ownerName, opts.seat)))
    : await db
        .select({ createdAt: schema.activities.createdAt, type: schema.activities.type })
        .from(schema.activities)
        .where(gte(schema.activities.createdAt, thirty));

  // Build a map: 'YYYY-MM-DD' → count
  const counts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirty);
    d.setDate(thirty.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
  }
  for (const r of rows) {
    if (!r.createdAt) continue;
    const key = r.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    fullDate: date,
    count,
  }));
}
