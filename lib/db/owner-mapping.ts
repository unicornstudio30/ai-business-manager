// Notion "Person" → app-user mapping health.
//
// The Notion CRM's Person column stores the owner name for each contact.
// Auto-sync (Sell/Market leaderboards) attributes activity to the matching
// user via `users.notion_person` first, then a case-insensitive `users.name`
// match. This module surfaces the current state of that mapping so admins
// can see who owns what — and fix any unmapped names.

import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db, schema } from "./client";

export type OwnerName = string;

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  notionPerson: string | null;
};

export type OwnerMappingRow = {
  ownerName: OwnerName;
  contactCount: number;
  activityCount: number;      // activities in the last 120 days on those contacts
  // Which app-user this owner_name currently resolves to (if any). null means
  // no user has notion_person or name matching this ownerName.
  mappedTo: UserSummary | null;
  matchedVia: "notion_person" | "name" | null;
};

export type OwnerMappingReport = {
  users: UserSummary[];                      // active users, for dropdown targets
  rows: OwnerMappingRow[];                   // one per distinct owner_name in CRM
  totalContactsWithOwner: number;
  totalContactsUnowned: number;              // owner_name null/empty
  mappedOwnerNames: number;                  // ownerName rows with mappedTo !== null
  unmappedOwnerNames: number;                // ownerName rows with mappedTo === null
};

// How many contacts each active user owns via the (notion_person || name)
// resolution. Runs its own owner_name → user resolution, then counts contacts.
export type UserOwnedCount = {
  userId: string;
  ownedContacts: number;
};

function resolveUser(
  ownerName: string,
  users: UserSummary[]
): { user: UserSummary; via: "notion_person" | "name" } | null {
  const needle = ownerName.trim().toLowerCase();
  if (!needle) return null;
  const byOverride = users.find(
    (u) => (u.notionPerson || "").trim().toLowerCase() === needle
  );
  if (byOverride) return { user: byOverride, via: "notion_person" };
  const byName = users.find((u) => (u.name || "").trim().toLowerCase() === needle);
  if (byName) return { user: byName, via: "name" };
  return null;
}

export async function getOwnerMappingReport(): Promise<OwnerMappingReport> {
  const users: UserSummary[] = (
    await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        notionPerson: schema.users.notionPerson,
      })
      .from(schema.users)
      .where(eq(schema.users.active, 1))
  );

  // Distinct owner_name + count of contacts holding it
  const ownerCounts = await db
    .select({
      ownerName: schema.contacts.ownerName,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .where(and(isNotNull(schema.contacts.ownerName), ne(schema.contacts.ownerName, "")))
    .groupBy(schema.contacts.ownerName);

  // Also: number of contacts with no owner_name at all
  const [{ n: totalUnowned = 0 } = { n: 0 }] = (await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.contacts)
    .where(sql`${schema.contacts.ownerName} is null or ${schema.contacts.ownerName} = ''`)) as { n: number }[];

  // Recent activity count per contact — bucket by owner_name for a health metric
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 120);
  const perContactActivity = await db
    .select({
      ownerName: schema.contacts.ownerName,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.activities)
    .leftJoin(schema.contacts, eq(schema.activities.contactId, schema.contacts.id))
    .where(and(
      isNotNull(schema.activities.createdAt),
      isNotNull(schema.contacts.ownerName)
    ))
    .groupBy(schema.contacts.ownerName);
  const activityByOwner = new Map(
    perContactActivity.map((r) => [r.ownerName ?? "", Number(r.cnt ?? 0)])
  );

  const rows: OwnerMappingRow[] = [];
  let mapped = 0;
  let unmapped = 0;
  let totalWithOwner = 0;
  for (const r of ownerCounts) {
    const ownerName = r.ownerName ?? "";
    if (!ownerName) continue;
    const contactCount = Number(r.cnt ?? 0);
    totalWithOwner += contactCount;
    const resolved = resolveUser(ownerName, users);
    if (resolved) mapped += 1;
    else unmapped += 1;
    rows.push({
      ownerName,
      contactCount,
      activityCount: activityByOwner.get(ownerName) ?? 0,
      mappedTo: resolved?.user ?? null,
      matchedVia: resolved?.via ?? null,
    });
  }

  // Sort: unmapped first (attention needed), then by contact count desc
  rows.sort((a, b) => {
    if (!!a.mappedTo !== !!b.mappedTo) return a.mappedTo ? 1 : -1;
    return b.contactCount - a.contactCount;
  });

  return {
    users,
    rows,
    totalContactsWithOwner: totalWithOwner,
    totalContactsUnowned: Number(totalUnowned),
    mappedOwnerNames: mapped,
    unmappedOwnerNames: unmapped,
  };
}

// Fast lookup: how many contacts each active user currently owns (attribution
// resolved). Used by the Users & roles table to show "N leads owned" per user.
export async function getUserOwnedCounts(): Promise<Map<string, number>> {
  const users: UserSummary[] = (
    await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        notionPerson: schema.users.notionPerson,
      })
      .from(schema.users)
      .where(eq(schema.users.active, 1))
  );

  const ownerCounts = await db
    .select({
      ownerName: schema.contacts.ownerName,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .where(and(isNotNull(schema.contacts.ownerName), ne(schema.contacts.ownerName, "")))
    .groupBy(schema.contacts.ownerName);

  const counts = new Map<string, number>();
  for (const r of ownerCounts) {
    const ownerName = r.ownerName ?? "";
    if (!ownerName) continue;
    const resolved = resolveUser(ownerName, users);
    if (!resolved) continue;
    counts.set(resolved.user.id, (counts.get(resolved.user.id) ?? 0) + Number(r.cnt ?? 0));
  }
  return counts;
}
