// One-way pull from Notion PRM database into local networking_contacts.
// Mirrors the read side of lib/notion/sync.ts. Write-back can be added once
// the user starts editing networking contacts in the app UI.

import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { notion } from "./client";
import { getPrmConfig } from "./prm-config";
import { notionToNetworkingContact } from "./prm-mapper";

export type PrmSyncResult = {
  pulled: number;
  inserted: number;
  updated: number;
  unchanged: number;
  error?: string;
};

export async function syncPrmFromNotion(): Promise<PrmSyncResult> {
  const cfg = await getPrmConfig();
  if (!cfg || !cfg.dataSourceId) {
    return { pulled: 0, inserted: 0, updated: 0, unchanged: 0, error: "PRM not configured" };
  }

  const startedAt = new Date();
  const n = notion();
  let cursor: string | undefined = undefined;
  let pulled = 0;
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  try {
    do {
      const res: any = await (n as any).dataSources.query({
        data_source_id: cfg.dataSourceId,
        page_size: 100,
        start_cursor: cursor,
      });

      for (const page of res.results) {
        pulled++;
        try {
          const mapped = notionToNetworkingContact(page);
          const existing = await db
            .select()
            .from(schema.networkingContacts)
            .where(eq(schema.networkingContacts.notionPageId, page.id))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(schema.networkingContacts).values(mapped);
            inserted++;
          } else {
            // Notion is canonical for reads — only skip update if Notion's
            // last_edited_time hasn't advanced since our last sync.
            const localEdited = existing[0].notionLastEditedAt?.getTime() ?? 0;
            const remoteEdited = mapped.notionLastEditedAt?.getTime() ?? 0;
            if (remoteEdited > localEdited) {
              await db
                .update(schema.networkingContacts)
                .set({ ...mapped, dirty: 0 })
                .where(eq(schema.networkingContacts.notionPageId, page.id));
              updated++;
            } else {
              unchanged++;
            }
          }
        } catch (e: any) {
          errors.push(`page ${page.id}: ${e?.message ?? e}`);
        }
      }

      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    return {
      pulled,
      inserted,
      updated,
      unchanged,
      error: e?.message ?? String(e),
    };
  }

  // Record in sync_log
  await db.insert(schema.syncLog).values({
    entity: "networking_contacts",
    direction: "pull",
    startedAt,
    finishedAt: new Date(),
    rowsChanged: inserted + updated,
    error: errors.length > 0 ? errors.slice(0, 3).join(" | ") : null,
  });

  return { pulled, inserted, updated, unchanged, error: errors[0] };
}
