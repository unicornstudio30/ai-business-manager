// Reusable read queries used across API routes and pages.

import { db, schema } from "./client";
import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  HOT_LEAD_STAGES,
  ACTIVE_CLIENT_STAGES,
  TERMINAL_STAGES,
  NO_FOLLOW_UP_STAGES,
  STAGE_GROUPS,
} from "../stages";

const EXCLUDED_FROM_FOLLOW_UP = [...TERMINAL_STAGES, ...NO_FOLLOW_UP_STAGES];

export async function getDashboardStats() {
  const [totals] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.contacts);

  const stageCounts = await db
    .select({
      status: schema.contacts.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.status);

  const map = new Map(stageCounts.map((r) => [r.status ?? "", Number(r.count)]));
  const hot = HOT_LEAD_STAGES.reduce((s, st) => s + (map.get(st) ?? 0), 0);
  const active = ACTIVE_CLIENT_STAGES.reduce((s, st) => s + (map.get(st) ?? 0), 0);

  // Need-follow-up: explicit followUpDate <= today OR statusDate > 11 days ago,
  // excluding terminal stages.
  const elevenDaysAgo = new Date(Date.now() - 11 * 86400000);
  const today = new Date();
  const followUps = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.contacts)
    .where(
      and(
        sql`(${schema.contacts.status} NOT IN (${sql.join(
          EXCLUDED_FROM_FOLLOW_UP.map((s) => sql`${s}`),
          sql`, `
        )}))`,
        or(
          and(
            sql`${schema.contacts.followUpDate} IS NOT NULL`,
            lt(schema.contacts.followUpDate, today)
          ),
          and(
            sql`${schema.contacts.statusDate} IS NOT NULL`,
            lt(schema.contacts.statusDate, elevenDaysAgo)
          )
        )
      )
    );

  return {
    totalContacts: Number(totals?.count ?? 0),
    hotLeads: hot,
    activeClients: active,
    needFollowUp: Number(followUps[0]?.count ?? 0),
    stageCounts: Object.fromEntries(map),
  };
}

export async function getHotLeads(limit = 20) {
  return db
    .select()
    .from(schema.contacts)
    .where(inArray(schema.contacts.status, [...HOT_LEAD_STAGES]))
    .orderBy(desc(schema.contacts.statusDate))
    .limit(limit);
}

export async function getNeedsFollowUp(days = 11, limit = 20) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const today = new Date();
  return db
    .select()
    .from(schema.contacts)
    .where(
      and(
        sql`(${schema.contacts.status} NOT IN (${sql.join(
          EXCLUDED_FROM_FOLLOW_UP.map((s) => sql`${s}`),
          sql`, `
        )}))`,
        or(
          and(
            sql`${schema.contacts.followUpDate} IS NOT NULL`,
            lt(schema.contacts.followUpDate, today)
          ),
          and(
            sql`${schema.contacts.statusDate} IS NOT NULL`,
            lt(schema.contacts.statusDate, cutoff)
          )
        )
      )
    )
    .orderBy(schema.contacts.statusDate)
    .limit(limit);
}

export async function getStageGroupCounts() {
  const stageCounts = await db
    .select({
      status: schema.contacts.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.status);
  const map = new Map(stageCounts.map((r) => [r.status ?? "", Number(r.count)]));
  const groups: Record<string, { count: number; stages: { name: string; count: number }[] }> = {};
  for (const [group, members] of Object.entries(STAGE_GROUPS)) {
    const stages = members.map((s) => ({ name: s, count: map.get(s) ?? 0 }));
    groups[group] = {
      count: stages.reduce((sum, s) => sum + s.count, 0),
      stages,
    };
  }
  return groups;
}

export async function getContactById(id: string) {
  const rows = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getContactActivities(contactId: string, limit = 50) {
  return db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.contactId, contactId))
    .orderBy(desc(schema.activities.createdAt))
    .limit(limit);
}

export async function listContacts(opts: {
  status?: string;
  search?: string;
  country?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (opts.status) conditions.push(eq(schema.contacts.status, opts.status));
  if (opts.country) conditions.push(eq(schema.contacts.country, opts.country));
  if (opts.platform) conditions.push(eq(schema.contacts.platform, opts.platform));
  if (opts.search) {
    const q = `%${opts.search.toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${schema.contacts.name}) LIKE ${q}`,
        sql`LOWER(${schema.contacts.email}) LIKE ${q}`
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  return db
    .select()
    .from(schema.contacts)
    .where(where)
    .orderBy(desc(schema.contacts.statusDate))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
}

export async function getTodayKpi() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const rows = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(
      and(gte(schema.dailySalesKpis.date, today), lt(schema.dailySalesKpis.date, tomorrow))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getYesterdayKpi() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const rows = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(
      and(gte(schema.dailySalesKpis.date, yesterday), lt(schema.dailySalesKpis.date, today))
    )
    .limit(1);
  return rows[0] ?? null;
}
