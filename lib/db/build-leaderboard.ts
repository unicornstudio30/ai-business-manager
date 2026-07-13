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
  type Stack,
} from "../builds/points";
import type { BuildActivity } from "./schema";

export type { LeaderboardResult } from "./leaderboard-engine";

export async function getBuildLeaderboard(weekStart?: string): Promise<LeaderboardResult> {
  return computeLeaderboard({
    activityTable: schema.buildActivities as any,
    targetTable: schema.buildWeeklyTargets as any,
    levelFn: levelFromLifetimePoints,
    defaultTargetFn: defaultTargetFor,
    weekStart,
  });
}

export async function logBuildActivity(input: {
  userId: string;
  stack: Stack;
  kind: ActivityKind;
  count?: number;
  notes?: string | null;
  weekStart?: string;
}): Promise<BuildActivity> {
  const ws = input.weekStart || weekStartFor();
  const count = Math.max(1, input.count ?? 1);
  const points = pointsFor(input.stack, input.kind, count);
  return (await logGeneric({
    activityTable: schema.buildActivities as any,
    values: {
      userId: input.userId,
      weekStart: ws,
      stack: input.stack,
      kind: input.kind,
      count,
      points,
      notes: input.notes ?? null,
    },
  })) as BuildActivity;
}

export async function deleteBuildActivity(id: string, userId: string): Promise<boolean> {
  return deleteOwnActivity({ activityTable: schema.buildActivities as any, id, userId });
}

export async function setBuildWeeklyTarget(input: {
  userId: string;
  weekStart: string;
  targetPoints: number;
  setBy: string;
}): Promise<void> {
  await setGenericTarget({ targetTable: schema.buildWeeklyTargets as any, ...input });
}
