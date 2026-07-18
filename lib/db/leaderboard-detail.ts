// Per-user activity feed for each leaderboard, used by the drill-down pages
// under /{market,sell,build}-or-die/user/[id]. Normalized to a common
// DetailActivity shape so the same DetailView can render all three.

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import { levelFromLifetimePoints as marketingLevel, defaultTargetFor as marketingTarget } from "../marketing/points";
import { levelFromLifetimePoints as salesLevel, defaultTargetFor as salesTarget } from "../sales/points";
import { levelFromLifetimePoints as buildLevel, defaultTargetFor as buildTarget } from "../builds/points";

export type LeaderboardVariant = "market" | "sell" | "build";

// One activity row, normalized. `secondary` is the leaderboard-specific
// modifier (platform for market, channel for sell, stack for build) —
// rendered as a small chip.
export type DetailActivity = {
  id: string;
  at: Date;
  kind: string;
  count: number;
  points: number;
  secondary: string;                  // platform / channel / stack
  notes: string | null;
  source: string | null;
};

export type DetailUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type UserDetail = {
  variant: LeaderboardVariant;
  user: DetailUser;
  level: 1 | 2 | 3 | 4;
  lifetimePoints: number;
  activityCount: number;
  defaultTarget: number;
  activities: DetailActivity[];       // sorted by at desc
};

const HARD_LIMIT = 2000;

export async function getMarketingUserDetail(userId: string): Promise<UserDetail | null> {
  const user = await getUser(userId);
  if (!user) return null;
  const rows = await db
    .select()
    .from(schema.marketingActivities)
    .where(eq(schema.marketingActivities.userId, userId))
    .orderBy(desc(schema.marketingActivities.createdAt))
    .limit(HARD_LIMIT);
  const activities: DetailActivity[] = rows
    .filter((r) => !!r.createdAt)
    .map((r) => ({
      id: r.id,
      at: r.createdAt!,
      kind: r.kind,
      count: r.count,
      points: r.points,
      secondary: r.platform,
      notes: r.notes,
      source: r.source,
    }));
  const lifetime = activities.reduce((s, a) => s + a.points, 0);
  return {
    variant: "market",
    user,
    level: marketingLevel(lifetime),
    lifetimePoints: lifetime,
    activityCount: activities.length,
    defaultTarget: marketingTarget(lifetime),
    activities,
  };
}

export async function getSalesUserDetail(userId: string): Promise<UserDetail | null> {
  const user = await getUser(userId);
  if (!user) return null;
  const rows = await db
    .select()
    .from(schema.salesActivities)
    .where(eq(schema.salesActivities.userId, userId))
    .orderBy(desc(schema.salesActivities.createdAt))
    .limit(HARD_LIMIT);
  const activities: DetailActivity[] = rows
    .filter((r) => !!r.createdAt)
    .map((r) => ({
      id: r.id,
      at: r.createdAt!,
      kind: r.kind,
      count: r.count,
      points: r.points,
      secondary: r.channel,
      notes: r.notes,
      source: r.source,
    }));
  const lifetime = activities.reduce((s, a) => s + a.points, 0);
  return {
    variant: "sell",
    user,
    level: salesLevel(lifetime),
    lifetimePoints: lifetime,
    activityCount: activities.length,
    defaultTarget: salesTarget(lifetime),
    activities,
  };
}

export async function getBuildUserDetail(userId: string): Promise<UserDetail | null> {
  const user = await getUser(userId);
  if (!user) return null;
  const rows = await db
    .select()
    .from(schema.buildActivities)
    .where(eq(schema.buildActivities.userId, userId))
    .orderBy(desc(schema.buildActivities.createdAt))
    .limit(HARD_LIMIT);
  const activities: DetailActivity[] = rows
    .filter((r) => !!r.createdAt)
    .map((r) => ({
      id: r.id,
      at: r.createdAt!,
      kind: r.kind,
      count: r.count,
      points: r.points,
      secondary: r.stack,
      notes: r.notes,
      source: r.source,
    }));
  const lifetime = activities.reduce((s, a) => s + a.points, 0);
  return {
    variant: "build",
    user,
    level: buildLevel(lifetime),
    lifetimePoints: lifetime,
    activityCount: activities.length,
    defaultTarget: buildTarget(lifetime),
    activities,
  };
}

async function getUser(userId: string): Promise<DetailUser | null> {
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}
