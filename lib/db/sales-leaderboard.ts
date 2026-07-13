import { schema } from "./client";
import {
  computeLeaderboard,
  logActivity as logGeneric,
  deleteOwnActivity,
  setTarget as setGenericTarget,
  type LeaderboardResult,
} from "./leaderboard-engine";
import {
  defaultTargetFor,
  levelFromLifetimePoints,
  pointsFor,
  weekStartFor,
  type ActivityKind,
  type Channel,
} from "../sales/points";
import type { SalesActivity } from "./schema";

export type { LeaderboardResult } from "./leaderboard-engine";

export async function getSalesLeaderboard(weekStart?: string): Promise<LeaderboardResult> {
  return computeLeaderboard({
    activityTable: schema.salesActivities as any,
    targetTable: schema.salesWeeklyTargets as any,
    levelFn: levelFromLifetimePoints,
    defaultTargetFn: defaultTargetFor,
    weekStart,
  });
}

export async function logSalesActivity(input: {
  userId: string;
  channel: Channel;
  kind: ActivityKind;
  count?: number;
  notes?: string | null;
  weekStart?: string;
}): Promise<SalesActivity> {
  const ws = input.weekStart || weekStartFor();
  const count = Math.max(1, input.count ?? 1);
  const points = pointsFor(input.channel, input.kind, count);
  return (await logGeneric({
    activityTable: schema.salesActivities as any,
    values: {
      userId: input.userId,
      weekStart: ws,
      channel: input.channel,
      kind: input.kind,
      count,
      points,
      notes: input.notes ?? null,
    },
  })) as SalesActivity;
}

export async function deleteSalesActivity(id: string, userId: string): Promise<boolean> {
  return deleteOwnActivity({ activityTable: schema.salesActivities as any, id, userId });
}

export async function setSalesWeeklyTarget(input: {
  userId: string;
  weekStart: string;
  targetPoints: number;
  setBy: string;
}): Promise<void> {
  await setGenericTarget({ targetTable: schema.salesWeeklyTargets as any, ...input });
}
