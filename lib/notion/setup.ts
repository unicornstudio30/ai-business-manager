// One-time setup helpers — add web-app-managed columns to the Notion CRM.
// Idempotent: skips columns that already exist.
//
// Adds 3 properties:
//   "Lead Score" (number)        — pushed from web app, recomputed on activity insert
//   "Closed Reason" (rich_text)  — pushed when you fill it in /wins-losses
//   "Latest Audit" (rich_text)   — pushed when /audit runs against a contact

import { notion, NOTION_DBS, isNotionConfigured } from "./client";

type SetupResult = { added: string[]; existed: string[]; error?: string };

const PROPERTIES_TO_ADD: Record<string, any> = {
  "Lead Score": { number: { format: "number" } },
  "Closed Reason": { rich_text: {} },
  "Latest Audit": { rich_text: {} },
};

export async function setupNotionCrmColumns(): Promise<SetupResult> {
  if (!isNotionConfigured()) {
    return { added: [], existed: [], error: "NOTION_TOKEN not set" };
  }

  const n = notion();
  const added: string[] = [];
  const existed: string[] = [];

  try {
    // Fetch the current database schema
    const db = await n.databases.retrieve({ database_id: NOTION_DBS.contacts });
    // In Notion v5, properties live on the data source(s) of the database.
    // Easiest path: just attempt the update with new properties; existing
    // ones won't conflict (Notion replaces only matching keys).
    const existingProps = (db as any).properties ?? {};

    const propsToAdd: Record<string, any> = {};
    for (const [name, schema] of Object.entries(PROPERTIES_TO_ADD)) {
      if (existingProps[name]) {
        existed.push(name);
      } else {
        propsToAdd[name] = schema;
      }
    }

    if (Object.keys(propsToAdd).length > 0) {
      // In Notion v5 the data sources own the schema, not the database.
      // Use dataSources.update with the data source ID.
      const { NOTION_DATA_SOURCES } = await import("./client");
      await n.dataSources.update({
        data_source_id: NOTION_DATA_SOURCES.contacts,
        properties: propsToAdd as any,
      } as any);
      added.push(...Object.keys(propsToAdd));
    }
  } catch (err: any) {
    return { added, existed, error: err?.message || String(err) };
  }

  return { added, existed };
}
