// Win/loss capture — derived from contacts in terminal stages, joined with
// closed_reason activities. No new schema; reasons live as activities of
// type='closed_reason' on the contact.

import { db, schema } from "./client";
import { eq, inArray, desc } from "drizzle-orm";
import type { Contact, Activity } from "./schema";

export const WIN_STAGES = ["Partnership"] as const;
export const LOSS_STAGES = ["Lost", "Closed without Partnership"] as const;
export const DISQUAL_STAGES = ["Not qualified"] as const;
const TERMINAL_STAGES = [...WIN_STAGES, ...LOSS_STAGES, ...DISQUAL_STAGES];

export type WinLossOutcome = "win" | "loss" | "disqualified";

export type ClosedDeal = {
  contact: Contact;
  outcome: WinLossOutcome;
  closedAt: Date | null;
  reasonActivity: Activity | null;
};

function classify(status: string | null): WinLossOutcome | null {
  if (!status) return null;
  if ((WIN_STAGES as readonly string[]).includes(status)) return "win";
  if ((LOSS_STAGES as readonly string[]).includes(status)) return "loss";
  if ((DISQUAL_STAGES as readonly string[]).includes(status)) return "disqualified";
  return null;
}

export async function listClosedDeals(opts: { limit?: number } = {}): Promise<ClosedDeal[]> {
  const contacts = await db
    .select()
    .from(schema.contacts)
    .where(inArray(schema.contacts.status, [...TERMINAL_STAGES]));

  if (contacts.length === 0) return [];

  // Pull all closed_reason activities for these contacts (latest per contact wins)
  const allActivities = await db
    .select()
    .from(schema.activities)
    .where(
      inArray(
        schema.activities.contactId,
        contacts.map((c) => c.id)
      )
    )
    .orderBy(desc(schema.activities.createdAt));

  const reasonByContact = new Map<string, Activity>();
  for (const a of allActivities) {
    if (a.type === "closed_reason" && a.contactId && !reasonByContact.has(a.contactId)) {
      reasonByContact.set(a.contactId, a);
    }
  }

  const items: ClosedDeal[] = contacts
    .map((c) => ({
      contact: c,
      outcome: classify(c.status)!,
      closedAt: c.closedDate ?? c.statusDate,
      reasonActivity: c.id ? reasonByContact.get(c.id) ?? null : null,
    }))
    .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));

  return opts.limit ? items.slice(0, opts.limit) : items;
}

export async function winLossSummary() {
  const all = await listClosedDeals();
  const counts = { win: 0, loss: 0, disqualified: 0 };
  for (const d of all) counts[d.outcome]++;

  // Win rate excludes disqualified (those weren't real opportunities)
  const opportunities = counts.win + counts.loss;
  const winRate = opportunities > 0 ? Math.round((counts.win / opportunities) * 100) : 0;

  // Common reasons (free-text), grouped by win/loss
  const winReasons: string[] = [];
  const lossReasons: string[] = [];
  for (const d of all) {
    if (!d.reasonActivity) continue;
    if (d.outcome === "win") winReasons.push(d.reasonActivity.content);
    if (d.outcome === "loss") lossReasons.push(d.reasonActivity.content);
  }

  return { counts, winRate, winReasons, lossReasons, total: all.length };
}
