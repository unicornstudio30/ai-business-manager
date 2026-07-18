// Shared leaderboard query engine. All three leaderboards (Market or Die /
// Sell or Die / Build or Die) use the same "load all users + all activities,
// bucket by week, compute streaks + ranks" pipeline; only the tables and the
// per-leaderboard target/level helpers differ.

import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { SQLiteTable, SQLiteColumn } from "drizzle-orm/sqlite-core";
import { db, schema } from "./client";
import { addWeeks, weekStartFor } from "../marketing/points";

export type LeaderRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  level: 1 | 2 | 3 | 4;
  lifetimePoints: number;
  weekPoints: number;
  targetPoints: number;
  pct: number;
  rank: number;
  hitTarget: boolean;
  streakWeeks: number;
  activityCount: number;
};

// Shape of any of the three activity tables. Any Drizzle table that has these
// column names + types works.
type ActivityTable = SQLiteTable & {
  userId: SQLiteColumn;
  weekStart: SQLiteColumn;
  points: SQLiteColumn;
  count: SQLiteColumn;
  source: SQLiteColumn;
  id: SQLiteColumn;
  createdAt: SQLiteColumn;
};

type TargetTable = SQLiteTable & {
  userId: SQLiteColumn;
  weekStart: SQLiteColumn;
  targetPoints: SQLiteColumn;
  id: SQLiteColumn;
};

// Any-typed accessor so the shared code can pluck columns off differently-
// -typed Drizzle tables at runtime without TS complaining. Values remain typed
// downstream because we cast the row objects on return.
function col<T>(row: any, k: string): T {
  return row[k] as T;
}

export type LeaderboardResult = {
  weekStart: string;
  rows: LeaderRow[];
};

export async function computeLeaderboard(opts: {
  activityTable: ActivityTable;
  targetTable: TargetTable;
  levelFn: (lifetime: number) => 1 | 2 | 3 | 4;
  defaultTargetFn: (lifetime: number) => number;
  weekStart?: string;
}): Promise<LeaderboardResult> {
  const ws = opts.weekStart || weekStartFor();

  const users = await db.select().from(schema.users).where(eq(schema.users.active, 1));

  const activities = await db.select().from(opts.activityTable as any);

  const lifetimeByUser = new Map<string, number>();
  const weekByUser = new Map<string, { points: number; count: number }>();
  for (const a of activities) {
    const uid = col<string>(a, "userId");
    const pts = col<number>(a, "points");
    const wk = col<string>(a, "weekStart");
    lifetimeByUser.set(uid, (lifetimeByUser.get(uid) ?? 0) + pts);
    if (wk === ws) {
      const cur = weekByUser.get(uid) ?? { points: 0, count: 0 };
      cur.points += pts;
      cur.count += 1;
      weekByUser.set(uid, cur);
    }
  }

  const targets = await db
    .select()
    .from(opts.targetTable as any)
    .where(eq((opts.targetTable as any).weekStart, ws));
  const targetByUser = new Map(
    targets.map((t: any) => [col<string>(t, "userId"), col<number>(t, "targetPoints")])
  );

  // Streaks — walk back at most 26 weeks per user.
  const streakByUser = new Map<string, number>();
  for (const u of users) {
    let streak = 0;
    let w = addWeeks(ws, -1);
    for (let i = 0; i < 26; i++) {
      const wPts = activities
        .filter((a: any) => col<string>(a, "userId") === u.id && col<string>(a, "weekStart") === w)
        .reduce((s: number, a: any) => s + col<number>(a, "points"), 0);
      const wTarget =
        targetByUser.get(u.id) ?? opts.defaultTargetFn(lifetimeByUser.get(u.id) ?? 0);
      if (wPts >= wTarget) {
        streak++;
        w = addWeeks(w, -1);
      } else break;
    }
    streakByUser.set(u.id, streak);
  }

  const rows: LeaderRow[] = users.map((u) => {
    const lifetime = lifetimeByUser.get(u.id) ?? 0;
    const week = weekByUser.get(u.id) ?? { points: 0, count: 0 };
    const target = targetByUser.get(u.id) ?? opts.defaultTargetFn(lifetime);
    const level = opts.levelFn(lifetime);
    return {
      userId: u.id,
      name: u.name || u.email.split("@")[0],
      email: u.email,
      role: u.role,
      level,
      lifetimePoints: lifetime,
      weekPoints: week.points,
      targetPoints: target,
      pct: target > 0 ? Math.round((week.points / target) * 100) : 0,
      rank: 0,
      hitTarget: week.points >= target,
      streakWeeks: streakByUser.get(u.id) ?? 0,
      activityCount: week.count,
    };
  });

  rows.sort((a, b) => b.weekPoints - a.weekPoints);
  let lastPts = -1;
  let lastRank = 0;
  rows.forEach((r, i) => {
    if (r.weekPoints !== lastPts) {
      lastRank = i + 1;
      lastPts = r.weekPoints;
    }
    r.rank = lastRank;
  });

  return { weekStart: ws, rows };
}

// Generic log/target upsert helpers. Point calculation happens in the caller
// so each leaderboard's per-kind values stay in its own points.ts.
export async function logActivity(opts: {
  activityTable: ActivityTable;
  values: Record<string, unknown>;
}) {
  const rows = (await db.insert(opts.activityTable as any).values(opts.values as any).returning()) as any[];
  return rows[0];
}

export async function deleteOwnActivity(opts: {
  activityTable: ActivityTable;
  id: string;
  userId: string;
}): Promise<boolean> {
  const res = await db
    .delete(opts.activityTable as any)
    .where(and(
      eq((opts.activityTable as any).id, opts.id),
      eq((opts.activityTable as any).userId, opts.userId)
    ))
    .returning({ id: (opts.activityTable as any).id });
  return res.length > 0;
}

export async function setTarget(opts: {
  targetTable: TargetTable;
  userId: string;
  weekStart: string;
  targetPoints: number;
  setBy: string;
  extraCols?: Record<string, unknown>;
}) {
  const existing = await db
    .select()
    .from(opts.targetTable as any)
    .where(and(
      eq((opts.targetTable as any).userId, opts.userId),
      eq((opts.targetTable as any).weekStart, opts.weekStart)
    ))
    .limit(1);
  if (existing[0]) {
    await db
      .update(opts.targetTable as any)
      .set({ targetPoints: opts.targetPoints, setBy: opts.setBy })
      .where(eq((opts.targetTable as any).id, (existing[0] as any).id));
  } else {
    await db.insert(opts.targetTable as any).values({
      userId: opts.userId,
      weekStart: opts.weekStart,
      targetPoints: opts.targetPoints,
      setBy: opts.setBy,
      ...(opts.extraCols ?? {}),
    } as any);
  }
}

// Daily-team-total time series for a leaderboard's activity table. Used by
// the trend chart shown at the top of each leaderboard page. Returns points
// per UTC day for the last `days` days, filled in with zeros on quiet days.
export type TrendPoint = { date: string; label: string; points: number; activities: number };

export async function computeLeaderboardTrend(opts: {
  activityTable: ActivityTable;
  days?: number;
}): Promise<TrendPoint[]> {
  const days = opts.days ?? 14;
  const now = new Date();
  const start = new Date();
  start.setUTCDate(now.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const rows = (await db
    .select({
      createdAt: (opts.activityTable as any).createdAt,
      points: (opts.activityTable as any).points,
    })
    .from(opts.activityTable as any)
    .where(gte((opts.activityTable as any).createdAt, start))) as any[];

  const buckets = new Map<string, { points: number; activities: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { points: 0, activities: 0 });
  }
  for (const r of rows) {
    const d = r.createdAt as Date | null;
    if (!d) continue;
    const key = d.toISOString().slice(0, 10);
    const cur = buckets.get(key) ?? { points: 0, activities: 0 };
    cur.points += Number(r.points ?? 0);
    cur.activities += 1;
    buckets.set(key, cur);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      // Short label: "Mon 7" for the axis
      label: new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      points: v.points,
      activities: v.activities,
    }));
}
