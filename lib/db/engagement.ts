// Queries for the engagement queue + daily counters.

import { db, schema } from "./client";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { HOT_LEAD_STAGES } from "../stages";

// Default daily targets — from Saidur's sales playbook.
// (Eventually configurable via /settings.)
export const DAILY_TARGETS = {
  cold_dms_sent: 8,
  cold_emails_sent: 7,
  follow_ups_sent: 15,
  warm_dms_sent: 5,
  comments_on_prospects: 12,
  calls_booked: 1,
  new_prospects: 5,
};

// Returns each contact + their most recent activity, ordered by lead score desc.
export async function listEngagementQueue(opts: { onlyHot?: boolean; limit?: number } = {}) {
  const conditions = [];
  if (opts.onlyHot) conditions.push(inArray(schema.contacts.status, [...HOT_LEAD_STAGES]));
  const contacts = await db
    .select()
    .from(schema.contacts)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(opts.limit ?? 100);

  // Fetch latest activity per contact (cheap with small N)
  const lastByContact = new Map<string, any>();
  if (contacts.length > 0) {
    const all = await db
      .select()
      .from(schema.activities)
      .where(inArray(schema.activities.contactId, contacts.map((c) => c.id)))
      .orderBy(desc(schema.activities.createdAt));
    for (const a of all) {
      if (a.contactId && !lastByContact.has(a.contactId)) {
        lastByContact.set(a.contactId, a);
      }
    }
  }

  const scoreRows = await db.select().from(schema.leadScores);
  const scoreMap = new Map(scoreRows.map((r) => [r.contactId, r.score]));

  const enriched = contacts.map((c) => ({
    contact: c,
    score: scoreMap.get(c.id) ?? 0,
    lastActivity: lastByContact.get(c.id) ?? null,
  }));

  enriched.sort((a, b) => b.score - a.score);
  return enriched;
}

// Today's activity counts by type — for daily progress bars.
export async function getTodayCounts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select({ type: schema.activities.type, count: sql<number>`count(*)` })
    .from(schema.activities)
    .where(gte(schema.activities.createdAt, today))
    .groupBy(schema.activities.type);

  const map = new Map(rows.map((r) => [r.type, Number(r.count)]));
  return {
    comments: map.get("comment_drafted") ?? 0,
    dms: map.get("dm_sent") ?? 0,
    follow_ups: map.get("follow_up_sent") ?? 0,
    emails: map.get("email_drafted") ?? 0,
    audits: map.get("audit_run") ?? 0,
    posts_observed: map.get("post_observed") ?? 0,
    notes: map.get("note") ?? 0,
  };
}
