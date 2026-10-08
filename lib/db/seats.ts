// LinkedIn seats for per-seat reporting.
//
// A seat is each distinct value of the Notion CRM "Person" column (mirrored as
// contacts.owner_name). New Person values show up automatically after the next
// Notion sync — nothing to configure.
//
// A seat maps to an app user via lib/name-matcher.ts: exact match first
// (users.notion_person pin, then display name), then a fuzzy name match that
// must be unambiguous. Seats with no matching user still appear in funnel and
// analytics (those filter contacts by owner directly); leaderboards are keyed
// by user, so an unmapped seat has an empty leaderboard.

import { eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { resolveOwnerName, type NameMatchTier } from "../name-matcher";
import type { LeaderboardResult } from "./leaderboard-engine";

export type Seat = {
  name: string;
  contactCount: number;
  user: { id: string; name: string; email: string } | null;
  matchedVia: Exclude<NameMatchTier, null> | null;
};

export async function listSeats(): Promise<Seat[]> {
  const [rows, users] = await Promise.all([
    db
      .select({ name: schema.contacts.ownerName, count: sql<number>`count(*)` })
      .from(schema.contacts)
      .where(isNotNull(schema.contacts.ownerName))
      .groupBy(schema.contacts.ownerName),
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        notionPerson: schema.users.notionPerson,
      })
      .from(schema.users)
      .where(eq(schema.users.active, 1)),
  ]);

  return rows
    .filter((r) => (r.name ?? "").trim() !== "")
    .map((r) => {
      const match = resolveOwnerName(r.name, users.map((u) => ({ ...u, name: u.name ?? "" })));
      return {
        name: r.name!,
        contactCount: Number(r.count),
        user: match ? { id: match.user.id, name: match.user.name, email: match.user.email } : null,
        matchedVia: match?.via ?? null,
      };
    })
    .sort((a, b) => b.contactCount - a.contactCount || a.name.localeCompare(b.name));
}

export async function getSeat(name: string | null | undefined): Promise<Seat | null> {
  if (!name) return null;
  return (await listSeats()).find((s) => s.name === name) ?? null;
}

// Same shape as the input, keeping only the seat's mapped user. Ranks stay
// team-wide so "rank 2" still means 2nd on the team.
export function filterLeaderboardBySeat(result: LeaderboardResult, seat: Seat | null): LeaderboardResult {
  if (!seat) return result;
  const uid = seat.user?.id;
  return { ...result, rows: uid ? result.rows.filter((r) => r.userId === uid) : [] };
}
