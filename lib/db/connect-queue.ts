// Today's prioritized CONNECT queue per platform.
//
// "Connect" here = sending a connection request (LinkedIn / FB friend req /
// X follow / IG follow) OR an InMail / cold first message — i.e. the very
// first touch with a prospect you're not yet linked to.
//
// Source: contacts in "Prospect" stage (haven't been outreached yet).
// Priority within each platform: Top 50 → Hot relations → ICP score desc.

import { db, schema } from "./client";
import { eq } from "drizzle-orm";
import { parseJson } from "../utils";
import { computeIcpScore } from "../icp-scoring";
import type { Contact } from "./schema";

export type ConnectQueueItem = {
  contact: Contact;
  icpScore: number;
  relations: string[];
  isTop50: boolean;
  priority: number;
  profileUrl: string | null;
  notionUrl: string | null;
};

export type ConnectQueueByPlatform = {
  byPlatform: Record<string, ConnectQueueItem[]>;
  platformOrder: string[];
  totals: { total: number; top50: number };
};

function priorityFor(item: Omit<ConnectQueueItem, "priority">): number {
  let p = item.icpScore;
  if (item.isTop50) p += 100;
  if (item.relations.includes("Engager")) p += 30;
  if (item.relations.includes("Open Conversation")) p += 20;
  return p;
}

export async function getConnectQueueByPlatform(): Promise<ConnectQueueByPlatform> {
  const prospects = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.status, "Prospect"));

  const byPlatform: Record<string, ConnectQueueItem[]> = {};
  const totals = { total: 0, top50: 0 };

  for (const c of prospects) {
    const relations = parseJson<string[]>(c.relation, []);
    const item: Omit<ConnectQueueItem, "priority"> = {
      contact: c,
      icpScore: computeIcpScore(c).score,
      relations,
      isTop50: c.top50 === 1,
      profileUrl: c.contactUrl ?? c.otherContactUrl ?? c.websiteUrl ?? null,
      notionUrl: c.notionPageId ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}` : null,
    };
    const full: ConnectQueueItem = { ...item, priority: priorityFor(item) };

    const platform = c.platform || "Other";
    if (!byPlatform[platform]) byPlatform[platform] = [];
    byPlatform[platform].push(full);

    totals.total++;
    if (full.isTop50) totals.top50++;
  }

  for (const p of Object.keys(byPlatform)) {
    byPlatform[p].sort((a, b) => b.priority - a.priority);
  }

  const platformOrder = Object.keys(byPlatform).sort(
    (a, b) => byPlatform[b].length - byPlatform[a].length
  );

  return { byPlatform, platformOrder, totals };
}
