// Notion PRM connection — IDs are hardcoded in lib/notion/client.ts alongside
// the other three Notion databases. This module is the read-side helper used by
// sync + pages.

import { NOTION_DBS, NOTION_DATA_SOURCES, notion } from "./client";

export type PrmNotionConfig = {
  databaseId: string;
  dataSourceId: string;
};

export function getPrmConfig(): PrmNotionConfig {
  return {
    databaseId: NOTION_DBS.prm,
    dataSourceId: NOTION_DATA_SOURCES.prm,
  };
}

// Notion DB URLs look like:
//   https://www.notion.so/<workspace>/<slug>-<32hex>?v=<viewid>
//   https://www.notion.so/<32hex>?v=...
//   https://app.notion.com/p/<32hex>?v=...
// The last hex segment before "?" is the database id. Kept for ops/debugging.
export function extractDatabaseId(url: string): string | null {
  const before = url.split("?")[0];
  const last = before.split("/").pop() ?? "";
  const hex = last.match(/[0-9a-f]{32}/i);
  if (!hex) return null;
  const raw = hex[0].toLowerCase();
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

// Discover the v5 data source id for a given database. Useful for ops scripts
// when adding a new Notion DB to client.ts.
export async function discoverDataSourceId(databaseId: string): Promise<string> {
  const n = notion();
  const db = await (n as any).databases.retrieve({ database_id: databaseId });
  const sources = db?.data_sources;
  if (Array.isArray(sources) && sources.length > 0 && sources[0]?.id) {
    return sources[0].id as string;
  }
  throw new Error("Database has no data sources");
}
