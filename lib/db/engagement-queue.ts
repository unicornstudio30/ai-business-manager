// Today's prioritized engagement queue per platform.
//
// "Engagement" here = commenting on a prospect's content (NOT DMing them).
// We surface contacts you should engage with TODAY, grouped by platform,
// with profile links (contactUrl) so you can click straight through to
// their LinkedIn/X/etc and leave a comment.
//
// Priority logic (per contact):
//   - In a hot stage (Lead / Lead Follow-ups / Qualified / Proposal Sent /
//     Proposal Follow-ups / Booking / First call) — always prioritized
//   - In Top 50 — always prioritized (long-term relationship investment)
//   - Has Relation = "Engager" — they engage with us; reciprocate
//   - Active stage with engageTouch < 5 (sequence not done)
//
// Sort within each platform: Top 50 first → highly engaged → ICP score desc.

import { db, schema } from "./client";
import { parseJson } from "../utils";
import { HOT_LEAD_STAGES } from "../stages";
import { computeIcpScore } from "../icp-scoring";
import type { Contact } from "./schema";

const CLOSED_STAGES = new Set([
  "Partnership",
  "Lost",
  "Closed without Partnership",
  "Not qualified",
  "Close",
]);
const HOT = new Set<string>([...HOT_LEAD_STAGES]);

export type EngagementQueueItem = {
  contact: Contact;
  icpScore: number;
  relations: string[];
  touchCount: number;
  isTop50: boolean;
  isHot: boolean;
  priority: number;       // higher = engage first
  // Derived link targets — the user clicks these to actually engage
  profileUrl: string | null;
  notionUrl: string | null;
};

export type EngagementQueueByPlatform = {
  byPlatform: Record<string, EngagementQueueItem[]>;
  // Platforms ordered by queue size desc
  platformOrder: string[];
  totals: { total: number; top50: number; hot: number; engager: number };
};

function priorityFor(item: Omit<EngagementQueueItem, "priority">): number {
  // Tunable weights — bigger numbers = engage sooner.
  let p = item.icpScore;          // 0–100 base
  if (item.isTop50) p += 100;     // Top 50 always pinned
  if (item.relations.includes("Engager")) p += 30;
  if (item.relations.includes("Open Conversation")) p += 20;
  if (item.isHot) p += 25;
  if (item.touchCount > 0 && item.touchCount < 5) p += 10;
  return p;
}

export async function getEngagementQueueByPlatform(): Promise<EngagementQueueByPlatform> {
  const all = await db.select().from(schema.contacts);
  const active = all.filter((c) => !c.status || !CLOSED_STAGES.has(c.status));

  const byPlatform: Record<string, EngagementQueueItem[]> = {};
  const totals = { total: 0, top50: 0, hot: 0, engager: 0 };

  for (const c of active) {
    const relations = parseJson<string[]>(c.relation, []);
    const item: Omit<EngagementQueueItem, "priority"> = {
      contact: c,
      icpScore: computeIcpScore(c).score,
      relations,
      touchCount: c.engageTouch ?? 0,
      isTop50: c.top50 === 1,
      isHot: !!c.status && HOT.has(c.status),
      profileUrl: c.contactUrl ?? c.otherContactUrl ?? c.websiteUrl ?? null,
      notionUrl: c.notionPageId ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}` : null,
    };
    const full: EngagementQueueItem = { ...item, priority: priorityFor(item) };

    const platform = c.platform || "Other";
    if (!byPlatform[platform]) byPlatform[platform] = [];
    byPlatform[platform].push(full);

    totals.total++;
    if (full.isTop50) totals.top50++;
    if (full.isHot) totals.hot++;
    if (full.relations.includes("Engager")) totals.engager++;
  }

  for (const p of Object.keys(byPlatform)) {
    byPlatform[p].sort((a, b) => b.priority - a.priority);
  }

  const platformOrder = Object.keys(byPlatform).sort(
    (a, b) => byPlatform[b].length - byPlatform[a].length
  );

  return { byPlatform, platformOrder, totals };
}
