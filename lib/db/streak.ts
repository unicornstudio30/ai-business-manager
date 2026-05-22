// Streak = consecutive days (ending today/yesterday) where ANY outreach
// activity was logged. Used by the dashboard gamification widget.

import { db, schema } from "./client";
import { desc, gte } from "drizzle-orm";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hasActivity(row: any): boolean {
  if (!row) return false;
  const sum =
    (row.coldDmsSent ?? 0) +
    (row.coldEmailsSent ?? 0) +
    (row.followUpsSent ?? 0) +
    (row.warmDmsSent ?? 0) +
    (row.commentsOnProspects ?? 0) +
    (row.leadMagnetsSent ?? 0) +
    (row.engagerDms ?? 0);
  if (sum > 0) return true;
  // Also check breakdown JSON
  if (row.breakdown) {
    try {
      const parsed = JSON.parse(row.breakdown);
      for (const platform of Object.keys(parsed)) {
        for (const action of Object.keys(parsed[platform] ?? {})) {
          if ((parsed[platform][action] ?? 0) > 0) return true;
        }
      }
    } catch { /* ignore */ }
  }
  return false;
}

export type StreakInfo = {
  current: number;        // consecutive days ending today (or yesterday if today empty)
  longest: number;        // longest run in last 365 days
  todayLogged: boolean;
  weekTotal: number;      // total actions this calendar week (Mon-Sun)
  weekDays: { date: string; total: number }[];  // 7 days for sparkline
};

export async function getStreak(): Promise<StreakInfo> {
  // Pull last 90 days for streak + last 7 for week
  const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(gte(schema.dailySalesKpis.date, ninetyAgo))
    .orderBy(desc(schema.dailySalesKpis.date));

  const byDay = new Map<string, any>();
  for (const r of rows) {
    if (r.date) byDay.set(dayKey(r.date), r);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogged = hasActivity(byDay.get(dayKey(today)));

  // Walk backwards day-by-day counting current streak.
  let current = 0;
  let cursor = new Date(today);
  // If today is empty, start counting from yesterday
  if (!todayLogged) cursor = new Date(today.getTime() - 86400000);
  while (true) {
    if (hasActivity(byDay.get(dayKey(cursor)))) {
      current++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else break;
  }

  // Longest streak in window
  let longest = 0;
  let run = 0;
  for (let i = 0; i < 90; i++) {
    const day = new Date(today.getTime() - i * 86400000);
    if (hasActivity(byDay.get(dayKey(day)))) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Week (last 7 days, oldest-first for sparkline)
  const weekDays: { date: string; total: number }[] = [];
  let weekTotal = 0;
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const row = byDay.get(dayKey(day));
    const total = totalActions(row);
    weekTotal += total;
    weekDays.push({ date: dayKey(day), total });
  }

  return { current, longest, todayLogged, weekTotal, weekDays };
}

function totalActions(row: any): number {
  if (!row) return 0;
  let sum =
    (row.coldDmsSent ?? 0) +
    (row.coldEmailsSent ?? 0) +
    (row.followUpsSent ?? 0) +
    (row.warmDmsSent ?? 0) +
    (row.commentsOnProspects ?? 0) +
    (row.leadMagnetsSent ?? 0) +
    (row.engagerDms ?? 0);
  if (row.breakdown) {
    try {
      const parsed = JSON.parse(row.breakdown);
      for (const platform of Object.keys(parsed)) {
        for (const action of Object.keys(parsed[platform] ?? {})) {
          sum += parsed[platform][action] ?? 0;
        }
      }
    } catch {}
  }
  return sum;
}
