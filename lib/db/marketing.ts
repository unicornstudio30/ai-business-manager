// "Market or Die" data layer: leaderboard, activity log, streaks, targets.

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./client";
import type { MarketingActivity, NewMarketingActivity, NewMarketingTarget, User } from "./schema";
import {
  addWeeks,
  defaultTargetFor,
  levelFromLifetimePoints,
  pointsFor,
  weekStartFor,
  type ActivityKind,
  type Level,
  type Platform,
} from "../marketing/points";

export type LeaderRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  level: Level;
  lifetimePoints: number;
  weekPoints: number;
  targetPoints: number;
  pct: number;
  rank: number;
  hitTarget: boolean;
  streakWeeks: number;
  activityCount: number;
};

// All current users + their points for the given week. Sorted desc by week
// points; rank assigned dense (ties get the same rank).
export async function getLeaderboard(weekStart?: string): Promise<{
  weekStart: string;
  rows: LeaderRow[];
}> {
  const ws = weekStart || weekStartFor();

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.active, 1));

  // Pull every activity in one shot — small table, fine for a single team.
  const activities = await db.select().from(schema.marketingActivities);
  const lifetimeByUser = new Map<string, number>();
  const weekByUser = new Map<string, { points: number; count: number }>();
  for (const a of activities) {
    lifetimeByUser.set(a.userId, (lifetimeByUser.get(a.userId) ?? 0) + a.points);
    if (a.weekStart === ws) {
      const cur = weekByUser.get(a.userId) ?? { points: 0, count: 0 };
      cur.points += a.points;
      cur.count += 1;
      weekByUser.set(a.userId, cur);
    }
  }

  const targets = await db
    .select()
    .from(schema.marketingWeeklyTargets)
    .where(eq(schema.marketingWeeklyTargets.weekStart, ws));
  const targetByUser = new Map(targets.map((t) => [t.userId, t.targetPoints]));

  // Streak: walk back week-by-week from the week BEFORE the displayed week,
  // counting consecutive weeks the user hit their target. Cap at 26 to keep
  // it bounded.
  const streakByUser = new Map<string, number>();
  for (const u of users) {
    let streak = 0;
    let w = addWeeks(ws, -1);
    for (let i = 0; i < 26; i++) {
      const wPts = activities
        .filter((a) => a.userId === u.id && a.weekStart === w)
        .reduce((s, a) => s + a.points, 0);
      const wTarget =
        targetByUser.get(u.id) ?? defaultTargetFor(lifetimeByUser.get(u.id) ?? 0);
      if (wPts >= wTarget) {
        streak++;
        w = addWeeks(w, -1);
      } else {
        break;
      }
    }
    streakByUser.set(u.id, streak);
  }

  const rows: LeaderRow[] = users.map((u) => {
    const lifetime = lifetimeByUser.get(u.id) ?? 0;
    const week = weekByUser.get(u.id) ?? { points: 0, count: 0 };
    const target =
      targetByUser.get(u.id) ?? defaultTargetFor(lifetime);
    const level = levelFromLifetimePoints(lifetime);
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
      rank: 0, // assigned after sort
      hitTarget: week.points >= target,
      streakWeeks: streakByUser.get(u.id) ?? 0,
      activityCount: week.count,
    };
  });

  // Sort by week points desc; assign ranks (1-indexed, ties share a rank).
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

// Per-user activity log for one week (most recent first).
export async function getActivitiesForUserWeek(
  userId: string,
  weekStart: string
): Promise<MarketingActivity[]> {
  return db
    .select()
    .from(schema.marketingActivities)
    .where(and(
      eq(schema.marketingActivities.userId, userId),
      eq(schema.marketingActivities.weekStart, weekStart)
    ))
    .orderBy(desc(schema.marketingActivities.createdAt));
}

export async function logMarketingActivity(input: {
  userId: string;
  platform: Platform;
  kind: ActivityKind;
  count?: number;
  notes?: string | null;
  weekStart?: string;
}): Promise<MarketingActivity> {
  const ws = input.weekStart || weekStartFor();
  const count = Math.max(1, input.count ?? 1);
  const points = pointsFor(input.platform, input.kind, count);
  const row: NewMarketingActivity = {
    userId: input.userId,
    weekStart: ws,
    platform: input.platform,
    kind: input.kind,
    count,
    points,
    notes: input.notes ?? null,
  };
  const [saved] = await db.insert(schema.marketingActivities).values(row).returning();
  return saved;
}

export async function deleteMarketingActivity(id: string, userId: string): Promise<boolean> {
  const res = await db
    .delete(schema.marketingActivities)
    .where(and(
      eq(schema.marketingActivities.id, id),
      eq(schema.marketingActivities.userId, userId)
    ))
    .returning({ id: schema.marketingActivities.id });
  return res.length > 0;
}

export async function setWeeklyTarget(input: {
  userId: string;
  weekStart: string;
  targetPoints: number;
  setBy: string;
}): Promise<void> {
  const existing = await db
    .select()
    .from(schema.marketingWeeklyTargets)
    .where(and(
      eq(schema.marketingWeeklyTargets.userId, input.userId),
      eq(schema.marketingWeeklyTargets.weekStart, input.weekStart)
    ))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.marketingWeeklyTargets)
      .set({ targetPoints: input.targetPoints, setBy: input.setBy })
      .where(eq(schema.marketingWeeklyTargets.id, existing[0].id));
  } else {
    const row: NewMarketingTarget = {
      userId: input.userId,
      weekStart: input.weekStart,
      targetPoints: input.targetPoints,
      setBy: input.setBy,
    };
    await db.insert(schema.marketingWeeklyTargets).values(row);
  }
}
