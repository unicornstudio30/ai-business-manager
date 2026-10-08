// Stage history. Notion only stores a contact's current Status, so PBM records
// every change it sees during a pull into stage_events. That table is what
// conversion rates, time-in-stage and stage velocity are computed from.

import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import { db, schema } from "../db/client";

export async function recordStageChange(input: {
  contactId: string;
  fromStage: string | null;
  toStage: string | null;
  seat: string | null;
  at: Date;
}): Promise<void> {
  if ((input.fromStage ?? null) === (input.toStage ?? null)) return;
  await db.insert(schema.stageEvents).values({ ...input, source: "pull" });
}

// Give every contact without history one starting event (its current stage at
// its Status Date, or when it was saved). Cheap and idempotent: contacts that
// already have an event are skipped.
export async function seedMissingStageEvents(): Promise<number> {
  const missing = await db
    .select({
      id: schema.contacts.id,
      status: schema.contacts.status,
      ownerName: schema.contacts.ownerName,
      statusDate: schema.contacts.statusDate,
      savedDate: schema.contacts.savedDate,
      createdAt: schema.contacts.createdAt,
    })
    .from(schema.contacts)
    .where(
      notExists(
        db.select({ one: sql`1` }).from(schema.stageEvents).where(eq(schema.stageEvents.contactId, schema.contacts.id))
      )
    );
  const rows = missing
    .filter((c) => c.status)
    .map((c) => ({
      contactId: c.id,
      fromStage: null,
      toStage: c.status,
      seat: c.ownerName,
      at: c.statusDate ?? c.savedDate ?? c.createdAt ?? new Date(),
      source: "seed",
    }));
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(schema.stageEvents).values(rows.slice(i, i + 50));
  }
  return rows.length;
}

// After a COMPLETE pull: flag contacts whose Notion page no longer exists.
// Never deletes — the row and its activities stay, reports just skip it.
export async function markMissingFromNotion(seenPageIds: Set<string>): Promise<number> {
  const linked = await db
    .select({ id: schema.contacts.id, pageId: schema.contacts.notionPageId, inNotion: schema.contacts.inNotion })
    .from(schema.contacts);
  const gone = linked.filter((c) => c.pageId && !seenPageIds.has(c.pageId) && c.inNotion === 1).map((c) => c.id);
  const unlinked = linked.filter((c) => !c.pageId && c.inNotion === 1).map((c) => c.id);
  const toFlag = [...gone, ...unlinked];
  for (let i = 0; i < toFlag.length; i += 100) {
    await db
      .update(schema.contacts)
      .set({ inNotion: 0 })
      .where(inArray(schema.contacts.id, toFlag.slice(i, i + 100)));
  }
  return toFlag.length;
}

// Used by the Data health page.
export async function stageHistoryCoverage() {
  const [events] = await db
    .select({
      total: sql<number>`count(*)`,
      seeds: sql<number>`sum(case when ${schema.stageEvents.source} = 'seed' then 1 else 0 end)`,
      first: sql<number>`min(${schema.stageEvents.at})`,
    })
    .from(schema.stageEvents);
  const [noHistory] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.inNotion, 1),
        notExists(
          db.select({ one: sql`1` }).from(schema.stageEvents).where(eq(schema.stageEvents.contactId, schema.contacts.id))
        )
      )
    );
  return {
    events: Number(events?.total ?? 0),
    seeded: Number(events?.seeds ?? 0),
    since: events?.first ? new Date(Number(events.first)) : null,
    contactsWithoutHistory: Number(noHistory?.n ?? 0),
  };
}

