// Stuck deals — derived from Notion CRM. Each pipeline stage has a
// "freshness threshold" — beyond which a contact in that stage is "stuck".
// Pure compute over the contacts table; no new state.

import { db, schema } from "./client";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Contact } from "./schema";
import { isClosed, stageGroup } from "../stages";
import { STUCK_GROUP_DEFAULT_DAYS, STUCK_SUGGESTED_ACTIONS, STUCK_THRESHOLDS_DAYS } from "../stage-config";

import { IN_NOTION } from "./active-contacts";
// Per-stage thresholds live in lib/stage-config.ts.
export { STUCK_THRESHOLDS_DAYS };

// Days before a contact in `status` counts as stuck, or null if that stage is
// never stuck (won / lost / disqualified, or a group with no default).
export function stuckThresholdFor(status: string | null | undefined): number | null {
  if (!status || isClosed(status)) return null;
  if (STUCK_THRESHOLDS_DAYS[status] !== undefined) return STUCK_THRESHOLDS_DAYS[status];
  const g = stageGroup(status);
  return g ? STUCK_GROUP_DEFAULT_DAYS[g] ?? null : null;
}

export type StuckDeal = {
  contact: Contact;
  daysStuck: number;
  threshold: number;
  overBy: number;
  suggestedAction: string;
};

export async function stuckDeals(opts: { seat?: string } = {}): Promise<StuckDeal[]> {
  const rows = await db
    .select()
    .from(schema.contacts)
    .where(and(IN_NOTION, opts.seat ? eq(schema.contacts.ownerName, opts.seat) : isNotNull(schema.contacts.status)));

  const now = Date.now();
  const items: StuckDeal[] = [];
  for (const c of rows) {
    const threshold = stuckThresholdFor(c.status);
    if (threshold === null) continue;
    const ref = c.lastTouchAt ?? c.statusDate;
    if (!ref) continue;
    const days = Math.floor((now - ref.getTime()) / 86400000);
    if (days >= threshold) {
      items.push({
        contact: c,
        daysStuck: days,
        threshold,
        overBy: days - threshold,
        suggestedAction: STUCK_SUGGESTED_ACTIONS[c.status!] ?? "Re-engage",
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
