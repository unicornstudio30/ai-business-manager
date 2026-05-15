// Stuck deals — derived from Notion CRM. Each pipeline stage has a
// "freshness threshold" — beyond which a contact in that stage is "stuck".
// Pure compute over the contacts table; no new state.

import { db, schema } from "./client";
import { inArray } from "drizzle-orm";
import type { Contact } from "./schema";
import { isTerminal, type Stage } from "../stages";

// Per-stage "stale after N days" thresholds. Tuned against Saidur's playbook.
// Higher number = more patience for that stage.
export const STUCK_THRESHOLDS_DAYS: Record<string, number> = {
  "Prospect": 7,
  "1st message": 4,
  "1st Prospect Follow-up": 5,
  "2nd Prospect Follow up": 7,
  "Lead": 4,
  "1st Lead Follow up": 5,
  "2nd Lead Follow up": 7,
  "Qualified": 5,
  "Proposal Sent": 4,                    // Day 3 followup overdue
  "Post Proposal Follow-up-1": 5,        // Day 7 followup overdue
  "Post Proposal Follow-up-2": 7,        // Day 14 close overdue
  "Booking": 2,
  "First call": 3,
  "Follow up later": 30,                 // long tail nurture
  // Terminal stages excluded automatically
};

export type StuckDeal = {
  contact: Contact;
  daysStuck: number;
  threshold: number;
  overBy: number;
  suggestedAction: string;
};

const SUGGESTED_ACTIONS: Record<string, string> = {
  "Prospect": "Send the LinkedIn step-1 connection note",
  "1st message": "Engage with 2-3 of their recent posts (LinkedIn step 2)",
  "1st Prospect Follow-up": "Send a value-first DM (LinkedIn step 3)",
  "2nd Prospect Follow up": "Switch channel — send the email case study (step 5)",
  "Lead": "Open-question DM about their AI/automation setup",
  "1st Lead Follow up": "Sharper question about their stated friction",
  "2nd Lead Follow up": "Voice note or short Loom — 60s personalized",
  "Qualified": "Propose a 20-min scoping call this week",
  "Proposal Sent": "Day-3 nudge — anchor on their stated outcome",
  "Post Proposal Follow-up-1": "Day-7 nudge — address the silent objection",
  "Post Proposal Follow-up-2": "Day-14 close — clarify yes / no / timing",
  "Booking": "Confirm time + send 3-question prep form",
  "First call": "Send written scope within 48h",
  "Follow up later": "Light value-add touch — no ask",
};

export async function stuckDeals(): Promise<StuckDeal[]> {
  // Only look at contacts in stages that HAVE a threshold (skips terminal stages)
  const stagesWithThresholds = Object.keys(STUCK_THRESHOLDS_DAYS);
  const rows = await db
    .select()
    .from(schema.contacts)
    .where(inArray(schema.contacts.status, stagesWithThresholds));

  const now = Date.now();
  const items: StuckDeal[] = [];
  for (const c of rows) {
    if (isTerminal(c.status)) continue;
    const ref = c.lastTouchAt ?? c.statusDate;
    if (!ref) continue;
    const days = Math.floor((now - ref.getTime()) / 86400000);
    const threshold = STUCK_THRESHOLDS_DAYS[c.status!];
    if (days >= threshold) {
      items.push({
        contact: c,
        daysStuck: days,
        threshold,
        overBy: days - threshold,
        suggestedAction: SUGGESTED_ACTIONS[c.status!] ?? "Re-engage",
      });
    }
  }

  // Most overdue first
  items.sort((a, b) => b.overBy - a.overBy);
  return items;
}

export async function stuckCount(): Promise<number> {
  return (await stuckDeals()).length;
}

// Group by stage for the dashboard widget
export async function stuckByStage(): Promise<Record<string, number>> {
  const items = await stuckDeals();
  const out: Record<string, number> = {};
  for (const i of items) {
    if (!i.contact.status) continue;
    out[i.contact.status] = (out[i.contact.status] ?? 0) + 1;
  }
  return out;
}
