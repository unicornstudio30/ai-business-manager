// Analytics queries for the dashboard charts.
// All pure SQL — no recompute required.

import { db, schema } from "./client";
import { gte, sql } from "drizzle-orm";
import { STAGE_GROUPS, type StageGroup } from "../stages";

// Funnel: count per dashboard-group, in order (Cold → Engaged → ... → Won).
export async function funnelCounts(): Promise<{ group: StageGroup; count: number }[]> {
  const rows = await db
    .select({
      status: schema.contacts.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.status);
  const byStatus = new Map(rows.map((r) => [r.status ?? "", Number(r.count)]));
  const order: StageGroup[] = ["Cold", "Engaged", "Qualified", "Proposal", "Call", "Won"];
  return order.map((group) => {
    const members = STAGE_GROUPS[group] as readonly string[];
    const count = members.reduce((s, st) => s + (byStatus.get(st) ?? 0), 0);
    return { group, count };
  });
}

// Score histogram: 5 buckets (0-19, 20-39, 40-59, 60-79, 80+).
export async function scoreHistogram() {
  const rows = await db.select({ score: schema.leadScores.score }).from(schema.leadScores);
  const buckets = [
    { range: "0–19", count: 0 },
    { range: "20–39", count: 0 },
    { range: "40–59", count: 0 },
    { range: "60–79", count: 0 },
    { range: "80+", count: 0 },
  ];
  for (const r of rows) {
    const s = r.score ?? 0;
    if (s < 20) buckets[0].count++;
    else if (s < 40) buckets[1].count++;
    else if (s < 60) buckets[2].count++;
    else if (s < 80) buckets[3].count++;
    else buckets[4].count++;
  }
  return buckets;
}

// Activity trend: count per day, last 30 days.
export async function activityTrend30d() {
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 29);
  thirty.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      createdAt: schema.activities.createdAt,
      type: schema.activities.type,
    })
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
