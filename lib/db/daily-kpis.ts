// Daily KPI helpers: read today + 7-day window, auto-suggest counts
// from activities (so the user doesn't have to manually count).

import { db, schema } from "./client";
import { and, desc, eq, gte, lt, sql, inArray } from "drizzle-orm";
import { platformToChannel, INBOX_CHANNELS, CHANNEL_LABELS, type InboxChannel } from "../inbox";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}

// Counts from activities for a single day, mapped to KPI columns.
// These are SUGGESTIONS — the user can override. We don't auto-write.
export async function suggestedCountsForDate(date: Date) {
  const start = startOfDay(date);
  const end = endOfDay(date);
  const rows = await db
    .select({ type: schema.activities.type, count: sql<number>`count(*)` })
    .from(schema.activities)
    .where(and(gte(schema.activities.createdAt, start), lt(schema.activities.createdAt, end)))
    .groupBy(schema.activities.type);

  const counts = new Map(rows.map((r) => [r.type, Number(r.count)]));
  return {
    coldDmsSent: counts.get("dm_sent") ?? 0,
    coldEmailsSent: counts.get("email_drafted") ?? 0,
    followUpsSent: counts.get("follow_up_sent") ?? 0,
    commentsOnProspects: counts.get("comment_drafted") ?? 0,
    warmDmsSent: 0,
    responses: 0,
    callsBooked: 0,
    newProspects: 0,
    inboundLeads: 0,
  };
}

export async function get7DaysOfKpis() {
  const days: { date: Date; row: typeof schema.dailySalesKpis.$inferSelect | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date(Date.now() - i * 86400000));
    const r = await db
      .select()
      .from(schema.dailySalesKpis)
      .where(eq(schema.dailySalesKpis.date, d))
      .limit(1);
    days.push({ date: d, row: r[0] ?? null });
  }
  return days;
}

export async function getKpiByDate(date: Date) {
  const d = startOfDay(date);
  const rows = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(eq(schema.dailySalesKpis.date, d))
    .limit(1);
  return rows[0] ?? null;
}

// Per-platform breakdown of activities for a given date.
// Joins activities with their contact's Notion `platform` field to
// segment outreach by channel (LinkedIn / X / Facebook / WhatsApp / Slack
// / Reddit / Email / Other). Returns one row per active platform with
// counts for each activity type.
export type PlatformDayCounts = {
  channel: InboxChannel;
  label: string;
  total: number;
  dms: number;            // dm_sent
  comments: number;       // comment_drafted
  followUps: number;      // follow_up_sent
  emails: number;         // email_drafted
  posts_observed: number; // post_observed
  audits: number;         // audit_run
  notes: number;          // note + closed_reason
};

export async function platformBreakdownForDate(date: Date): Promise<PlatformDayCounts[]> {
  const start = startOfDay(date);
  const end = endOfDay(date);

  const acts = await db
    .select({
      type: schema.activities.type,
      contactId: schema.activities.contactId,
      activityChannel: schema.activities.channel, // explicit override if set
    })
    .from(schema.activities)
    .where(and(gte(schema.activities.createdAt, start), lt(schema.activities.createdAt, end)));

  if (acts.length === 0) return [];

  // Pull all contact platforms in one query
  const contactIds = [...new Set(acts.map((a) => a.contactId).filter((id): id is string => !!id))];
  const contacts = contactIds.length
    ? await db
        .select({ id: schema.contacts.id, platform: schema.contacts.platform })
        .from(schema.contacts)
        .where(inArray(schema.contacts.id, contactIds))
    : [];
  const platformByContactId = new Map(contacts.map((c) => [c.id, c.platform]));

  // Bucket activities by channel
  const buckets = new Map<InboxChannel, PlatformDayCounts>();
  for (const a of acts) {
    const explicit = a.activityChannel as InboxChannel | null;
    const fromContact = a.contactId ? platformToChannel(platformByContactId.get(a.contactId)) : null;
    const ch: InboxChannel = explicit ?? fromContact ?? "other";

    if (!buckets.has(ch)) {
      buckets.set(ch, {
        channel: ch,
        label: CHANNEL_LABELS[ch] ?? ch,
        total: 0,
        dms: 0,
        comments: 0,
        followUps: 0,
        emails: 0,
        posts_observed: 0,
        audits: 0,
        notes: 0,
      });
    }
    const b = buckets.get(ch)!;
    b.total++;
    switch (a.type) {
      case "dm_sent": b.dms++; break;
      case "comment_drafted": b.comments++; break;
      case "follow_up_sent": b.followUps++; break;
      case "email_drafted": b.emails++; break;
      case "post_observed": b.posts_observed++; break;
      case "audit_run": b.audits++; break;
      case "note":
      case "closed_reason":
        b.notes++; break;
    }
  }

  // Stable order: known channels first, then any "other"
  return INBOX_CHANNELS
    .map((c) => buckets.get(c))
    .filter((x): x is PlatformDayCounts => !!x);
}

// 7-day per-platform totals — for the trend strip
export async function platformBreakdown7Days(): Promise<{
  date: Date;
  byChannel: Partial<Record<InboxChannel, number>>;
  total: number;
}[]> {
  const days: { date: Date; byChannel: Partial<Record<InboxChannel, number>>; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date(Date.now() - i * 86400000));
    const breakdown = await platformBreakdownForDate(d);
    const byChannel: Partial<Record<InboxChannel, number>> = {};
    let total = 0;
    for (const b of breakdown) {
      byChannel[b.channel] = b.total;
      total += b.total;
    }
    days.push({ date: d, byChannel, total });
  }
  return days;
}

export async function upsertKpi(date: Date, fields: Partial<typeof schema.dailySalesKpis.$inferInsert>) {
  const d = startOfDay(date);
  const existing = await getKpiByDate(d);
  if (existing) {
    const [updated] = await db
      .update(schema.dailySalesKpis)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(schema.dailySalesKpis.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.dailySalesKpis)
    .values({ date: d, ...fields })
    .returning();
  return created;
}
