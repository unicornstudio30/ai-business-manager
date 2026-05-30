// Stores the Notion PRM database connection: parsed database ID + the
// data source ID Notion v5 requires for queries. Persisted in app_settings.

import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { notion } from "./client";

const KEY = "prm_notion";

export type PrmNotionConfig = {
  databaseId: string;
  dataSourceId: string | null;
  rawUrl?: string;
};

export async function getPrmConfig(): Promise<PrmNotionConfig | null> {
  try {
    const rows = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, KEY))
      .limit(1);
    const value = rows[0]?.value;
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (!parsed.databaseId) return null;
    return {
      databaseId: parsed.databaseId,
      dataSourceId: parsed.dataSourceId ?? null,
      rawUrl: parsed.rawUrl,
    };
  } catch {
    return null;
  }
}

export async function savePrmConfig(config: PrmNotionConfig): Promise<void> {
  const value = JSON.stringify(config);
  const existing = await db
    .select({ key: schema.appSettings.key })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, KEY))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.appSettings.key, KEY));
  } else {
    await db.insert(schema.appSettings).values({ key: KEY, value, updatedAt: new Date() });
  }
}

// Notion DB URLs look like:
//   https://www.notion.so/<workspace>/<slug>-<32hex>?v=<viewid>
//   https://www.notion.so/<32hex>?v=...
//   https://www.notion.so/<workspace>/<32hex>?v=...
// The last hex segment before "?" is the database id.
export function extractDatabaseId(url: string): string | null {
  // Strip query string
  const before = url.split("?")[0];
  const last = before.split("/").pop() ?? "";
  // Match 32-hex (may be the tail of a slug or the whole segment)
  const hex = last.match(/[0-9a-f]{32}/i);
  if (!hex) return null;
  const raw = hex[0].toLowerCase();
  // Format with dashes (8-4-4-4-12)
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

// Notion v5: each database has 1+ data sources. Queries + page creation target
// the data source id, not the database id. Discover the default data source.
export async function discoverDataSourceId(databaseId: string): Promise<string | null> {
  const n = notion();
  try {
    const db = await (n as any).databases.retrieve({ database_id: databaseId });
    const sources = db?.data_sources;
    if (Array.isArray(sources) && sources.length > 0 && sources[0]?.id) {
      return sources[0].id as string;
    }
    return null;
  } catch (e) {
    console.error("[prm] discoverDataSourceId failed:", e);
    return null;
  }
}
