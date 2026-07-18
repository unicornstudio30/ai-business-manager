// Notion "Person" → app-user mapping health.
//
// The Notion CRM's Person column stores the owner name for each contact.
// Auto-sync (Sell/Market leaderboards) attributes activity to the matching
// user via `users.notion_person` first, then case-insensitive `users.name`,
// then a fuzzy name match (edit distance + prefix, ambiguity → no match).
// See lib/name-matcher.ts. This module surfaces the current state so admins
// can see who owns what — and pin fuzzy matches to explicit overrides.

import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { resolveOwnerName, type NameMatchTier } from "../name-matcher";
import { HOT_LEAD_STAGES, STAGE_GROUPS, isActiveClient, isTerminal, type Stage } from "../stages";

// Split contacts by CRM Status into meaningful buckets. Everything is
// driven by the actual Status field in Notion — no arbitrary counts.
//   cold   — top-of-funnel (Prospect / Connection / 1st message / Inmail /
//            Prospect follow-ups)
//   leads  — active pipeline (Lead through First call = HOT_LEAD_STAGES)
//   clients — Partnership
//   (archived stages — Lost / Closed / Not qualified / Follow up later —
//    are excluded from these three counts)
const COLD_STAGES = new Set<string>([...STAGE_GROUPS.Cold]);
const LEAD_STAGES = new Set<string>(HOT_LEAD_STAGES);

export type StatusBreakdown = {
  cold: number;
  leads: number;
  clients: number;
  archived: number;    // Lost / Closed without Partnership / Not qualified / Follow up later
  total: number;       // sum incl archived
};

function bucketStatus(status: string | null): keyof StatusBreakdown | null {
  if (!status) return null;
  if (LEAD_STAGES.has(status)) return "leads";
  if (COLD_STAGES.has(status)) return "cold";
  if (isActiveClient(status)) return "clients";
  if (isTerminal(status) || status === "Follow up later") return "archived";
  return null;
}

function emptyBreakdown(): StatusBreakdown {
  return { cold: 0, leads: 0, clients: 0, archived: 0, total: 0 };
}

export type OwnerName = string;

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  notionPerson: string | null;
};

export type OwnerMappingRow = {
  ownerName: OwnerName;
  contactCount: number;            // total, incl. archived
  breakdown: StatusBreakdown;      // cold / leads / clients / archived (from CRM Status)
  activityCount: number;           // recent activities
  // Which app-user this owner_name currently resolves to (if any).
  //   - "notion_person": exact match on override column (deterministic)
  //   - "name": exact match on user's display name
  //   - "fuzzy": similar-name match (only when exactly one user matches)
  //   - null: unmapped — auto-sync falls through to the workspace owner
  mappedTo: UserSummary | null;
  matchedVia: Exclude<NameMatchTier, null> | null;
};

export type OwnerMappingReport = {
  users: UserSummary[];                      // active users, for dropdown targets
  rows: OwnerMappingRow[];                   // one per distinct owner_name in CRM
  totalContactsWithOwner: number;
  totalContactsUnowned: number;              // owner_name null/empty
  mappedOwnerNames: number;                  // ownerName rows with mappedTo !== null
  unmappedOwnerNames: number;                // ownerName rows with mappedTo === null
};

// How many contacts each active user owns, bucketed by CRM Status.
export type UserOwnedCount = {
  userId: string;
  breakdown: StatusBreakdown;
};

// Shared resolver — same tiers as auto-sync so both surfaces agree.
function resolveUser(
  ownerName: string,
  users: UserSummary[]
): { user: UserSummary; via: Exclude<NameMatchTier, null> } | null {
  const match = resolveOwnerName(ownerName, users);
  if (!match) return null;
  return { user: match.user, via: match.via };
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

  // Distinct (owner_name, status) with counts — so we can bucket by CRM Status.
  const ownerStatusCounts = await db
    .select({
      ownerName: schema.contacts.ownerName,
      status: schema.contacts.status,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .where(and(isNotNull(schema.contacts.ownerName), ne(schema.contacts.ownerName, "")))
    .groupBy(schema.contacts.ownerName, schema.contacts.status);

  // Also: number of contacts with no owner_name at all
  const [{ n: totalUnowned = 0 } = { n: 0 }] = (await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.contacts)
    .where(sql`${schema.contacts.ownerName} is null or ${schema.contacts.ownerName} = ''`)) as { n: number }[];

  // Recent activity count per owner — cheap health metric
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 120);
  const perOwnerActivity = await db
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
    perOwnerActivity.map((r) => [r.ownerName ?? "", Number(r.cnt ?? 0)])
  );

  // Roll up per-owner breakdowns
  const perOwner = new Map<string, StatusBreakdown>();
  for (const r of ownerStatusCounts) {
    const ownerName = r.ownerName ?? "";
    if (!ownerName) continue;
    const bucket = bucketStatus(r.status);
    const n = Number(r.cnt ?? 0);
    const cur = perOwner.get(ownerName) ?? emptyBreakdown();
    if (bucket && bucket !== "total") cur[bucket] += n;
    cur.total += n;
    perOwner.set(ownerName, cur);
  }

  const rows: OwnerMappingRow[] = [];
  let mapped = 0;
  let unmapped = 0;
  let totalWithOwner = 0;
  for (const [ownerName, breakdown] of perOwner.entries()) {
    totalWithOwner += breakdown.total;
    const resolved = resolveUser(ownerName, users);
    if (resolved) mapped += 1;
    else unmapped += 1;
    rows.push({
      ownerName,
      contactCount: breakdown.total,
      breakdown,
      activityCount: activityByOwner.get(ownerName) ?? 0,
      mappedTo: resolved?.user ?? null,
      matchedVia: resolved?.via ?? null,
    });
  }

  // Sort: unmapped first (attention needed), then by active pipeline (leads) desc
  rows.sort((a, b) => {
    if (!!a.mappedTo !== !!b.mappedTo) return a.mappedTo ? 1 : -1;
    return b.breakdown.leads - a.breakdown.leads || b.contactCount - a.contactCount;
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

// Per-user breakdown of owned contacts by CRM Status.
// Cold / Leads / Clients derived from lib/stages.ts groupings — same as the
// dashboard uses. Archived (Lost / Closed / Not qualified / Follow up later)
// tracked but not surfaced by default.
export async function getUserOwnedCounts(): Promise<Map<string, StatusBreakdown>> {
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

  const ownerStatusCounts = await db
    .select({
      ownerName: schema.contacts.ownerName,
      status: schema.contacts.status,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.contacts)
    .where(and(isNotNull(schema.contacts.ownerName), ne(schema.contacts.ownerName, "")))
    .groupBy(schema.contacts.ownerName, schema.contacts.status);

  const byUser = new Map<string, StatusBreakdown>();
  for (const r of ownerStatusCounts) {
    const ownerName = r.ownerName ?? "";
    if (!ownerName) continue;
    const resolved = resolveUser(ownerName, users);
    if (!resolved) continue;
    const cur = byUser.get(resolved.user.id) ?? emptyBreakdown();
    const bucket = bucketStatus(r.status);
    const n = Number(r.cnt ?? 0);
    if (bucket && bucket !== "total") cur[bucket] += n;
    cur.total += n;
    byUser.set(resolved.user.id, cur);
  }
  return byUser;
}
