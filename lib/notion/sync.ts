// Bidirectional Notion <-> SQLite sync engine.
// - PULL: paginated query of each Notion DB; upsert into local SQLite.
// - PUSH: scan local rows with dirty=1; push changes to Notion; mark dirty=0.
// - Last-write-wins by timestamp; Notion wins on ties (the user is more often there).

import { db, schema } from "../db/client";
import { eq, sql } from "drizzle-orm";
import { notion, NOTION_DATA_SOURCES, isNotionConfigured } from "./client";
import { notionToContact, contactToNotionProperties } from "./contacts-mapper";
import { notionToContentItem, contentToNotionProperties } from "./content-mapper";
import { notionToTrackerEntry } from "./tracker-mapper";
import { emitInferredActivities } from "./inferred-activities";
import { recomputeOne } from "../db/lead-scores";
import type { PageObjectResponse } from "@notionhq/client";

type SyncResult = { entity: string; pulled: number; pushed: number; error?: string };

// ──────────────────── helpers ────────────────────

async function logRun(
  entity: "contacts" | "tracker_entries" | "content_items",
  direction: "pull" | "push",
  fn: () => Promise<number>
): Promise<{ rows: number; error?: string }> {
  const start = new Date();
  let rows = 0;
  let errorMsg: string | undefined;
  try {
    rows = await fn();
  } catch (err: any) {
    errorMsg = err?.message || String(err);
  }
  await db.insert(schema.syncLog).values({
    entity,
    direction,
    startedAt: start,
    finishedAt: new Date(),
    rowsChanged: rows,
    error: errorMsg ?? null,
  });
  return { rows, error: errorMsg };
}

async function* paginatedQuery(dataSourceId: string, pageSize = 100, deadlineMs?: number) {
  const n = notion();
  let cursor: string | undefined = undefined;
  do {
    if (deadlineMs && Date.now() > deadlineMs) {
      // Soft deadline reached — stop yielding so caller can return mid-pagination.
      return;
    }
    const res: any = await n.dataSources.query({
      data_source_id: dataSourceId,
      page_size: pageSize,
      start_cursor: cursor,
    });
    for (const page of res.results) {
      if ((page as any).object === "page") yield page as PageObjectResponse;
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

// Single function deadline — Vercel Hobby tier = 10s function timeout.
// Subtract 1500ms safety margin to leave time for response serialization.
const VERCEL_HOBBY_DEADLINE_MS = 8500;
function getDeadline(): number {
  return Date.now() + VERCEL_HOBBY_DEADLINE_MS;
}

// ──────────────────── pull (Notion → local) ────────────────────

async function pullContacts(deadlineMs?: number): Promise<number> {
  let count = 0;
  for await (const page of paginatedQuery(NOTION_DATA_SOURCES.contacts, 100, deadlineMs)) {
    const row = notionToContact(page);
    // Fetch the FULL existing row so we can diff fields (engageTouch, status)
    // and emit inferred activities when CRM updates happen in Notion.
    const existing = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.notionPageId, page.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.contacts).values(row);
      count++;
    } else {
      const prev = existing[0];
      const localEdited = prev.notionLastEditedAt?.getTime() ?? 0;
      const notionEdited = row.notionLastEditedAt?.getTime() ?? 0;
      if (notionEdited > localEdited) {
        // Detect Notion-side changes BEFORE we overwrite the local row.
        // Emits dm_sent / note activities so daily KPI counters reflect
        // CRM updates without requiring manual entry.
        try {
          const emitted = await emitInferredActivities(prev, row, prev.id);
          if (emitted > 0) {
            // Recompute lead score so the new activities affect ranking
            recomputeOne(prev.id).catch(() => {});
          }
        } catch (err) {
          // Don't fail the sync if inference has a bug
          console.error(`Inferred activity emit failed for ${prev.id}:`, err);
        }

        await db
          .update(schema.contacts)
          .set({ ...row, dirty: 0 })
          .where(eq(schema.contacts.id, prev.id));
        count++;
      }
    }
  }
  return count;
}

async function pullContent(deadlineMs?: number): Promise<number> {
  let count = 0;
  for await (const page of paginatedQuery(NOTION_DATA_SOURCES.content, 100, deadlineMs)) {
    const row = notionToContentItem(page);
    const existing = await db
      .select({ id: schema.contentItems.id, lastEdited: schema.contentItems.notionLastEditedAt })
      .from(schema.contentItems)
      .where(eq(schema.contentItems.notionPageId, page.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.contentItems).values(row);
      count++;
    } else {
      const localEdited = existing[0].lastEdited?.getTime() ?? 0;
      const notionEdited = row.notionLastEditedAt?.getTime() ?? 0;
      if (notionEdited > localEdited) {
        await db
          .update(schema.contentItems)
          .set({ ...row, dirty: 0 })
          .where(eq(schema.contentItems.id, existing[0].id));
        count++;
      }
    }
  }
  return count;
}

async function pullTracker(deadlineMs?: number): Promise<number> {
  let count = 0;
  for await (const page of paginatedQuery(NOTION_DATA_SOURCES.tracker, 100, deadlineMs)) {
    const row = notionToTrackerEntry(page);
    const existing = await db
      .select({ id: schema.trackerEntries.id, lastEdited: schema.trackerEntries.notionLastEditedAt })
      .from(schema.trackerEntries)
      .where(eq(schema.trackerEntries.notionPageId, page.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.trackerEntries).values(row);
      count++;
    } else {
      const localEdited = existing[0].lastEdited?.getTime() ?? 0;
      const notionEdited = row.notionLastEditedAt?.getTime() ?? 0;
      if (notionEdited > localEdited) {
        await db
          .update(schema.trackerEntries)
          .set({ ...row, dirty: 0 })
          .where(eq(schema.trackerEntries.id, existing[0].id));
        count++;
      }
    }
  }
  return count;
}

// ──────────────────── push (local dirty → Notion) ────────────────────

async function pushContacts(): Promise<number> {
  const dirty = await db.select().from(schema.contacts).where(eq(schema.contacts.dirty, 1));
  if (dirty.length === 0) return 0;
  const n = notion();
  let count = 0;
  for (const c of dirty) {
    try {
      const props = contactToNotionProperties(c);
      if (c.notionPageId) {
        await n.pages.update({ page_id: c.notionPageId, properties: props });
      } else {
        const created = await n.pages.create({
          parent: { type: "data_source_id", data_source_id: NOTION_DATA_SOURCES.contacts },
          properties: props,
        } as any);
        await db
          .update(schema.contacts)
          .set({ notionPageId: created.id })
          .where(eq(schema.contacts.id, c.id));
      }
      await db
        .update(schema.contacts)
        .set({ dirty: 0, notionLastSyncedAt: new Date() })
        .where(eq(schema.contacts.id, c.id));
      count++;
    } catch (err: any) {
      // leave dirty=1 to retry next sync
      console.error(`Push contact ${c.id} failed:`, err.message);
    }
  }
  return count;
}

async function pushContent(): Promise<number> {
  const dirty = await db.select().from(schema.contentItems).where(eq(schema.contentItems.dirty, 1));
  if (dirty.length === 0) return 0;
  const n = notion();
  let count = 0;
  for (const c of dirty) {
    try {
      const props = contentToNotionProperties(c);
      if (c.notionPageId) {
        await n.pages.update({ page_id: c.notionPageId, properties: props });
      } else {
        const created = await n.pages.create({
          parent: { type: "data_source_id", data_source_id: NOTION_DATA_SOURCES.content },
          properties: props,
        } as any);
        await db
          .update(schema.contentItems)
          .set({ notionPageId: created.id })
          .where(eq(schema.contentItems.id, c.id));
      }
      await db
        .update(schema.contentItems)
        .set({ dirty: 0, notionLastSyncedAt: new Date() })
        .where(eq(schema.contentItems.id, c.id));
      count++;
    } catch (err: any) {
      console.error(`Push content ${c.id} failed:`, err.message);
    }
  }
  return count;
}

// ──────────────────── public API ────────────────────

export async function syncContacts(): Promise<SyncResult> {
  if (!isNotionConfigured()) {
    return { entity: "contacts", pulled: 0, pushed: 0, error: "NOTION_TOKEN not set" };
  }
  const deadline = getDeadline();
  const pull = await logRun("contacts", "pull", () => pullContacts(deadline));
  const push = await logRun("contacts", "push", pushContacts);
  return { entity: "contacts", pulled: pull.rows, pushed: push.rows, error: pull.error ?? push.error };
}

export async function syncContentItems(): Promise<SyncResult> {
  if (!isNotionConfigured()) {
    return { entity: "content_items", pulled: 0, pushed: 0, error: "NOTION_TOKEN not set" };
  }
  const deadline = getDeadline();
  const pull = await logRun("content_items", "pull", () => pullContent(deadline));
  const push = await logRun("content_items", "push", pushContent);
  return { entity: "content_items", pulled: pull.rows, pushed: push.rows, error: pull.error ?? push.error };
}

export async function syncTrackerEntries(): Promise<SyncResult> {
  if (!isNotionConfigured()) {
    return { entity: "tracker_entries", pulled: 0, pushed: 0, error: "NOTION_TOKEN not set" };
  }
  const deadline = getDeadline();
  const pull = await logRun("tracker_entries", "pull", () => pullTracker(deadline));
  return { entity: "tracker_entries", pulled: pull.rows, pushed: 0, error: pull.error };
}

// Vercel Hobby has 10s function timeout, so the orchestrator runs each entity's
// sync in its own request rather than in parallel. The /api/sync route accepts
// ?entity=contacts|content_items|tracker_entries and the SyncButton iterates them.
export async function syncNotion(entity?: "contacts" | "content_items" | "tracker_entries"): Promise<SyncResult[]> {
  if (entity === "contacts") return [await syncContacts()];
  if (entity === "content_items") return [await syncContentItems()];
  if (entity === "tracker_entries") return [await syncTrackerEntries()];
  // Default: do all three sequentially. Works on Pro tier; on Hobby may time out
  // for very large initial syncs — frontend should call per-entity in that case.
  const results: SyncResult[] = [];
  results.push(await syncContacts());
  results.push(await syncContentItems());
  results.push(await syncTrackerEntries());
  return results;
}

export async function syncStatus() {
  const rows = await db
    .select({
      entity: schema.syncLog.entity,
      direction: schema.syncLog.direction,
      finishedAt: schema.syncLog.finishedAt,
      rowsChanged: schema.syncLog.rowsChanged,
      error: schema.syncLog.error,
    })
    .from(schema.syncLog)
    .orderBy(sql`${schema.syncLog.finishedAt} DESC`)
    .limit(50);
  return { configured: isNotionConfigured(), recent: rows };
}
