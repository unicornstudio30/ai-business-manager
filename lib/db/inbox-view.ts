// Inbox is a derived view of the CRM — no new state.
// A contact "needs your attention" when:
//   (a) their follow_up_date is past, OR
//   (b) they're in a stage that's waiting for your move
//
// Read-only. Source of truth is the Notion CRM (which we mirror to Turso).

import { db, schema } from "./client";
import { and, asc, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { platformToChannel, type InboxChannel } from "../inbox";
import type { Contact } from "./schema";

// Stages where you owe the next move (you sent something, awaiting reply)
export const WAITING_STAGES = [
  "1st message",
  "1st Prospect Follow-up",
  "2nd Prospect Follow up",
  "1st Lead Follow up",
  "2nd Lead Follow up",
  "Proposal Sent",
  "Post Proposal Follow-up-1",
  "Post Proposal Follow-up-2",
] as const;

// Stale threshold = waiting stages + last touch >N days ago count as "needs reply"
const STALE_DAYS = 3;

export type InboxItem = {
  contact: Contact;
  reason: "follow_up_overdue" | "waiting_reply_stale";
  daysSince: number | null;
  channel: InboxChannel;
};

export async function inboxView(opts: { channel?: InboxChannel } = {}): Promise<InboxItem[]> {
  const today = new Date();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400000);

  const rows = await db
    .select()
    .from(schema.contacts)
    .where(
      or(
        // (a) overdue follow-up
        and(isNotNull(schema.contacts.followUpDate), lt(schema.contacts.followUpDate, today)),
        // (b) in waiting stage AND last touch is stale
        and(
          inArray(schema.contacts.status, [...WAITING_STAGES]),
          isNotNull(schema.contacts.lastTouchAt),
          lt(schema.contacts.lastTouchAt, staleCutoff)
        )
      )
    );

  const items: InboxItem[] = rows.map((c) => {
    const isOverdue = c.followUpDate && c.followUpDate < today;
    const ref = isOverdue ? c.followUpDate! : c.lastTouchAt;
    const days = ref ? Math.floor((today.getTime() - ref.getTime()) / 86400000) : null;
    const channel = platformToChannel(c.platform) ?? "other";
    return {
      contact: c,
      reason: isOverdue ? "follow_up_overdue" : "waiting_reply_stale",
      daysSince: days,
      channel,
    };
  });

  // Sort: most-overdue first
  items.sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));

  return opts.channel ? items.filter((i) => i.channel === opts.channel) : items;
}

export async function inboxCounts() {
  const items = await inboxView();
  const byChannel: Record<string, number> = {};
  for (const i of items) byChannel[i.channel] = (byChannel[i.channel] ?? 0) + 1;
  return { total: items.length, byChannel };
}
