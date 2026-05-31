// The "next draft" queue — Cadence-style ordering of which networking contact
// to reach out to next. Surfaced on /networking/next-draft and via the
// networking_next_drafts MCP tool so Claude UI can pick the next message to
// draft.
//
// Priority (highest first):
//   1. Follow-up due today or overdue (from Notion "Next Follow-up")
//   2. Going cold — last contact > 30d ago (still in active relationship)
//   3. Never contacted — synced from Notion but no networking_messages yet
//
// Skips: contacts whose stage is closed-equivalent if you've set one.

import { and, desc, eq, isNull, lte, sql, gte } from "drizzle-orm";
import { db, schema } from "./client";
import type { NetworkingContact } from "./schema";

const DAY = 86_400_000;
const COLD_DAYS = 30;

const CLOSED_STAGES = new Set<string>([
  "Closed", "Lost", "Take a break", "Archived", "Dormant",
]);

export type NextDraftReason =
  | "follow_up_overdue"      // Next Follow-up date is past
  | "follow_up_today"        // Next Follow-up is today
  | "going_cold"             // Last contact > 30 days
  | "never_messaged"         // No draft yet in networking_messages
  | "fresh_no_draft";        // Recently synced from Notion, no message yet

export type NextDraftItem = {
  contact: NetworkingContact;
  reason: NextDraftReason;
  priority: number;          // higher = draft first
  daysSinceContact: number | null;
  daysUntilFollowUp: number | null;
  hasDraftedBefore: boolean;
  notionUrl: string | null;
};

export type NextDraftQueue = {
  items: NextDraftItem[];
  totals: { overdue: number; dueToday: number; goingCold: number; neverMessaged: number };
};

function reasonPriority(r: NextDraftReason): number {
  switch (r) {
    case "follow_up_overdue": return 100;
    case "follow_up_today": return 80;
    case "going_cold": return 60;
    case "never_messaged": return 40;
    case "fresh_no_draft": return 20;
  }
}

export async function getNetworkingNextDrafts(limit = 30): Promise<NextDraftQueue> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const coldCutoff = new Date(now.getTime() - COLD_DAYS * DAY);

  const [contacts, messages] = await Promise.all([
    db.select().from(schema.networkingContacts),
    db.select({ contactId: schema.networkingMessages.contactId }).from(schema.networkingMessages),
  ]);
  const hasDraft = new Set(messages.map((m) => m.contactId));

  const items: NextDraftItem[] = [];

  for (const c of contacts) {
    if (c.stage && CLOSED_STAGES.has(c.stage)) continue;

    let reason: NextDraftReason | null = null;
    const fup = c.nextFollowUpAt;
    if (fup) {
      if (fup < today) reason = "follow_up_overdue";
      else if (fup < tomorrow) reason = "follow_up_today";
    }

    if (!reason && c.lastContactAt && c.lastContactAt < coldCutoff) {
      reason = "going_cold";
    }

    if (!reason && !hasDraft.has(c.id)) {
      // Never drafted in the app. Two sub-cases: never contacted at all, or
      // contacted via Notion but no app-side draft yet.
      reason = c.lastContactAt ? "fresh_no_draft" : "never_messaged";
    }

    if (!reason) continue;

    const daysSinceContact = c.lastContactAt
      ? Math.floor((now.getTime() - c.lastContactAt.getTime()) / DAY)
      : null;
    const daysUntilFollowUp = c.nextFollowUpAt
      ? Math.ceil((c.nextFollowUpAt.getTime() - today.getTime()) / DAY)
      : null;
    const notionUrl = c.notionPageId
      ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`
      : null;

    items.push({
      contact: c,
      reason,
      priority: reasonPriority(reason),
      daysSinceContact,
      daysUntilFollowUp,
      hasDraftedBefore: hasDraft.has(c.id),
      notionUrl,
    });
  }

  items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Secondary: most-overdue follow-up first; oldest contact second
    if (a.daysUntilFollowUp !== null && b.daysUntilFollowUp !== null) {
      return a.daysUntilFollowUp - b.daysUntilFollowUp;
    }
    if (a.daysSinceContact !== null && b.daysSinceContact !== null) {
      return b.daysSinceContact - a.daysSinceContact;
    }
    return 0;
  });

  const totals = {
    overdue: items.filter((i) => i.reason === "follow_up_overdue").length,
    dueToday: items.filter((i) => i.reason === "follow_up_today").length,
    goingCold: items.filter((i) => i.reason === "going_cold").length,
    neverMessaged: items.filter((i) => i.reason === "never_messaged" || i.reason === "fresh_no_draft").length,
  };

  return { items: items.slice(0, limit), totals };
}
