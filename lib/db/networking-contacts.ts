// Read queries for the networking PRM. Mirrors lib/db/queries.ts patterns
// but scoped to the networking_contacts table.

import { and, desc, eq, like, lte, or, sql } from "drizzle-orm";
import { db, schema } from "./client";
import type { NetworkingContact } from "./schema";

export type ListNetworkingFilters = {
  search?: string;
  stage?: string;
  relationship?: string;
  limit?: number;
};

export async function listNetworkingContacts(
  filters: ListNetworkingFilters = {}
): Promise<NetworkingContact[]> {
  const conds: any[] = [];
  if (filters.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    conds.push(
      or(
        like(sql`lower(${schema.networkingContacts.name})`, q),
        like(sql`lower(coalesce(${schema.networkingContacts.company}, ''))`, q),
        like(sql`lower(coalesce(${schema.networkingContacts.profession}, ''))`, q),
      )
    );
  }
  if (filters.stage) conds.push(eq(schema.networkingContacts.stage, filters.stage));
  if (filters.relationship)
    conds.push(eq(schema.networkingContacts.relationship, filters.relationship));

  let query: any = db.select().from(schema.networkingContacts);
  if (conds.length > 0) query = query.where(and(...conds));
  return query
    .orderBy(desc(schema.networkingContacts.updatedAt))
    .limit(filters.limit ?? 200);
}

export async function getNetworkingContact(id: string): Promise<NetworkingContact | null> {
  const rows = await db
    .select()
    .from(schema.networkingContacts)
    .where(eq(schema.networkingContacts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getNetworkingStats() {
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.networkingContacts);

  const stages = await db
    .select({
      stage: schema.networkingContacts.stage,
      count: sql<number>`count(*)`,
    })
    .from(schema.networkingContacts)
    .groupBy(schema.networkingContacts.stage);

  const relationships = await db
    .select({
      relationship: schema.networkingContacts.relationship,
      count: sql<number>`count(*)`,
    })
    .from(schema.networkingContacts)
    .groupBy(schema.networkingContacts.relationship);

  // Overdue follow-ups
  const today = new Date();
  const [overdueRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.networkingContacts)
    .where(
      and(
        sql`${schema.networkingContacts.nextFollowUpAt} IS NOT NULL`,
        lte(schema.networkingContacts.nextFollowUpAt, today)
      )
    );

  return {
    total: Number(totalRow?.count ?? 0),
    overdueFollowUps: Number(overdueRow?.count ?? 0),
    byStage: stages
      .filter((r) => r.stage)
      .map((r) => ({ stage: r.stage as string, count: Number(r.count) })),
    byRelationship: relationships
      .filter((r) => r.relationship)
      .map((r) => ({ relationship: r.relationship as string, count: Number(r.count) })),
  };
}
