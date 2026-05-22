// DM history — chronological feed of DM-related activity.
//
// What counts as a "DM event":
//   - dm_sent activity (inferred from Status moving to "1st message" or a
//     Follow-up stage, or manually logged via /api/activities)
//   - follow_up_sent activity
//   - reply_received activity (replies you've logged or inferred from status flips
//     into Lead / Qualified)
//
// Source of truth: the `activities` table, which is itself derived from Notion
// CRM state via lib/notion/inferred-activities.ts.

import { db, schema } from "./client";
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import type { Activity, Contact } from "./schema";
import { CHANNEL_LABELS, type InboxChannel } from "../inbox";

export type DmHistoryItem = {
  activity: Activity;
  contact: Contact | null;
  channel: InboxChannel | null;
  channelLabel: string | null;
};

const DM_TYPES = ["dm_sent", "follow_up_sent", "reply_received"];

export async function getDmHistory(opts: {
  channel?: InboxChannel;
  since?: Date;
  limit?: number;
} = {}): Promise<DmHistoryItem[]> {
  const limit = opts.limit ?? 100;
  const since = opts.since ?? new Date(Date.now() - 30 * 86400000);  // default last 30 days

  const conditions = [
    inArray(schema.activities.type, DM_TYPES),
    gte(schema.activities.createdAt, since),
  ];
  if (opts.channel) {
    conditions.push(eq(schema.activities.channel, opts.channel));
  }

  const rows = await db
    .select()
    .from(schema.activities)
    .where(and(...conditions))
    .orderBy(desc(schema.activities.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  // Fetch related contacts in one go
  const contactIds = Array.from(
    new Set(rows.map((r) => r.contactId).filter((id): id is string => !!id))
  );
  const contactsRows = contactIds.length
    ? await db.select().from(schema.contacts).where(inArray(schema.contacts.id, contactIds))
    : [];
  const contactById = new Map<string, Contact>();
  for (const c of contactsRows) contactById.set(c.id, c);

  return rows.map((activity) => {
    const contact = activity.contactId ? contactById.get(activity.contactId) ?? null : null;
    const channel = (activity.channel ?? null) as InboxChannel | null;
    return {
      activity,
      contact,
      channel,
      channelLabel: channel ? CHANNEL_LABELS[channel] ?? channel : null,
    };
  });
}

// Counts per channel for tabs (last 30 days)
export async function getDmHistoryCounts(): Promise<{ total: number; byChannel: Record<string, number> }> {
  const items = await getDmHistory({ limit: 1000 });
  const byChannel: Record<string, number> = {};
  for (const i of items) {
    if (i.channel) byChannel[i.channel] = (byChannel[i.channel] ?? 0) + 1;
  }
  return { total: items.length, byChannel };
}
