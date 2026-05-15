// Reusable queries for the meetings page + dashboard widget + MCP tools.

import { db, schema } from "./client";
import { and, asc, desc, gte, lt } from "drizzle-orm";

const NOW = () => new Date();

export async function upcomingMeetings(limit = 20) {
  return db
    .select()
    .from(schema.meetings)
    .where(gte(schema.meetings.scheduledAt, NOW()))
    .orderBy(asc(schema.meetings.scheduledAt))
    .limit(limit);
}

export async function recentMeetings(daysBack = 14, limit = 20) {
  const since = new Date(Date.now() - daysBack * 86400000);
  return db
    .select()
    .from(schema.meetings)
    .where(and(gte(schema.meetings.scheduledAt, since), lt(schema.meetings.scheduledAt, NOW())))
    .orderBy(desc(schema.meetings.scheduledAt))
    .limit(limit);
}

export async function nextMeetings(n = 3) {
  return db
    .select()
    .from(schema.meetings)
    .where(gte(schema.meetings.scheduledAt, NOW()))
    .orderBy(asc(schema.meetings.scheduledAt))
    .limit(n);
}
