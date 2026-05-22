// Engagement queue grouped by platform with daily engagement level.
//
// Level is derived from Notion signals:
//   - highly_engaged: Relation includes "Engager" OR "Open Conversation",
//     OR engageTouch >= 3, OR activity within last 24h
//   - touched: engageTouch >= 1, OR has any Relation value, OR ICP >= 60
//   - cold: everyone else still in active pipeline
//
// Closed contacts (Partnership/Lost/etc.) excluded.

import { db, schema } from "./client";
import { desc, inArray, gte } from "drizzle-orm";
import { computeIcpScore } from "../icp-scoring";
import { parseJson } from "../utils";
import type { Contact } from "./schema";

const CLOSED_STAGES = new Set([
  "Partnership",
  "Lost",
  "Closed without Partnership",
  "Not qualified",
  "Close",
]);

export type EngagementLevel = "highly_engaged" | "touched" | "cold";

export type EngagementContact = {
  contact: Contact;
  level: EngagementLevel;
  icpScore: number;
  touchCount: number;
  relations: string[];
  hasRecentActivity: boolean;
  lastTouchAt: Date | null;
};

export type EngagementByPlatform = {
  // Map of platform string (as stored in Notion) → engagement contacts list
  byPlatform: Record<string, EngagementContact[]>;
  // Totals across all platforms
  totals: {
    total: number;
    highlyEngaged: number;
    touched: number;
    cold: number;
  };
  // Today's activity stats per platform (derived from activities)
  dailyActivityByPlatform: Record<string, number>;
};

function classifyEngagement(c: Contact, hasRecentActivity: boolean): EngagementLevel {
  const relations = parseJson<string[]>(c.relation, []);
  const touch = c.engageTouch ?? 0;
  const icp = computeIcpScore(c).score;

  if (relations.includes("Engager") || relations.includes("Open Conversation")) return "highly_engaged";
  if (touch >= 3) return "highly_engaged";
  if (hasRecentActivity) return "highly_engaged";

  if (touch >= 1) return "touched";
  if (relations.length > 0) return "touched";
  if (icp >= 60) return "touched";

  return "cold";
}

export async function getEngagementByPlatform(): Promise<EngagementByPlatform> {
  // Pull all contacts not closed
  const allContacts = await db.select().from(schema.contacts);
  const active = allContacts.filter((c) => !c.status || !CLOSED_STAGES.has(c.status));

  // Recent activities (last 24h) by contact
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActs = await db
    .select({ contactId: schema.activities.contactId, channel: schema.activities.channel, createdAt: schema.activities.createdAt })
    .from(schema.activities)
    .where(gte(schema.activities.createdAt, yesterday));
  const recentContactIds = new Set<string>();
  const dailyActivityByPlatform: Record<string, number> = {};
  for (const a of recentActs) {
    if (a.contactId) recentContactIds.add(a.contactId);
    if (a.channel) {
      dailyActivityByPlatform[a.channel] = (dailyActivityByPlatform[a.channel] ?? 0) + 1;
    }
  }

  // Build per-platform buckets
  const byPlatform: Record<string, EngagementContact[]> = {};
  const totals = { total: 0, highlyEngaged: 0, touched: 0, cold: 0 };

  for (const c of active) {
    const hasRecent = recentContactIds.has(c.id);
    const level = classifyEngagement(c, hasRecent);
    const platform = c.platform || "Other";
    const item: EngagementContact = {
      contact: c,
      level,
      icpScore: computeIcpScore(c).score,
      touchCount: c.engageTouch ?? 0,
      relations: parseJson<string[]>(c.relation, []),
      hasRecentActivity: hasRecent,
      lastTouchAt: c.lastTouchAt ?? c.statusDate ?? null,
    };
    if (!byPlatform[platform]) byPlatform[platform] = [];
    byPlatform[platform].push(item);

    totals.total++;
    if (level === "highly_engaged") totals.highlyEngaged++;
    else if (level === "touched") totals.touched++;
    else totals.cold++;
  }

  // Sort each platform: highly_engaged first, then by ICP score desc
  const order: Record<EngagementLevel, number> = { highly_engaged: 0, touched: 1, cold: 2 };
  for (const p of Object.keys(byPlatform)) {
    byPlatform[p].sort((a, b) => {
      const ord = order[a.level] - order[b.level];
      if (ord !== 0) return ord;
      return b.icpScore - a.icpScore;
    });
  }

  return { byPlatform, totals, dailyActivityByPlatform };
}
