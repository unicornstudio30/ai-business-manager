import { Client } from "@notionhq/client";

export const NOTION_TOKEN = process.env.NOTION_TOKEN;

// IDs of the three Notion databases (top-level entity).
// Notion v5 introduced a separate "data source" layer underneath each database;
// queries and page creation target the data source ID, not the database ID.
export const NOTION_DBS = {
  contacts: "35d0b601-369a-8051-9256-ec4232d5f6a8",       // Sales CRM
  tracker: "35d0b601-369a-80f8-ade3-d37534cd7281",        // Sales tracker
  content: "35d0b601-369a-8002-ab44-ea2c54c93ac3",        // Content Calendar
} as const;

// Data source IDs (default data source per database). Discovered via Notion search.
// In v5 every database has at least one data source — these are the underlying tables.
export const NOTION_DATA_SOURCES = {
  contacts: "35d0b601-369a-814e-9007-000b9fa4c9ae",       // Sales CRM rows
  tracker: "35d0b601-369a-8140-a2c7-000b9a49286f",        // Sales tracker entries
  content: "35d0b601-369a-8194-a168-000bc640943d",        // Content Calendar items
} as const;

let _notion: Client | null = null;

export function notion(): Client {
  if (!NOTION_TOKEN) {
    throw new Error(
      "NOTION_TOKEN not set. Create a Notion integration at " +
        "https://www.notion.so/profile/integrations, share the 3 databases " +
        "with it, and add NOTION_TOKEN=secret_... to .env.local"
    );
  }
  if (!_notion) _notion = new Client({ auth: NOTION_TOKEN });
  return _notion;
}

export const isNotionConfigured = () => !!NOTION_TOKEN;
