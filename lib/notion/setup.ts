// One-time setup helpers — add web-app-managed columns to Notion.
// Idempotent: skips columns that already exist. When a select column already
// exists, adds any missing options without disturbing existing ones.
//
// CRM adds 1 property:
//   "Closed Reason" (rich_text)  — pushed when you fill it in /wins-losses
//
// Content Calendar adds/updates:
//   "Type" (select) — populated with the same items as the Market or Die
//                     log modal's Type dropdown (ALL_KINDS from
//                     lib/marketing/points.ts). Existing options are kept.

import { notion, NOTION_DBS, NOTION_DATA_SOURCES, isNotionConfigured } from "./client";
import { ALL_KINDS } from "../marketing/points";
import { ALL_KINDS as SALES_KINDS } from "../sales/points";

type SetupResult = { added: string[]; existed: string[]; error?: string };

// Sales action items that show up as Notion multi_select options on the CRM
// "Actions" column. Users check them in Notion → sync → app creates
// sales_activities rows.
const SALES_ACTION_ITEMS: string[] = SALES_KINDS.map((k) => k.label);

const CRM_PROPERTIES_TO_ADD: Record<string, any> = {
  "Closed Reason": { rich_text: {} },
  // Rolling log of Sell or Die activities on this contact. The app appends
  // one line per stage/action log (newest first). Read-only from Notion's
  // perspective — treat it as an audit trail.
  "Log Actions": { rich_text: {} },
  // User-facing multi-select. Check any of these items in Notion on a
  // contact → next sync creates matching sales_activities rows credited to
  // the contact owner. Idempotent (source-keyed per contact+item).
  "Actions": {
    multi_select: { options: SALES_ACTION_ITEMS.map((name) => ({ name })) },
  },
};

export async function setupNotionCrmColumns(): Promise<SetupResult & { mergedActionsOptions?: string[] }> {
  if (!isNotionConfigured()) {
    return { added: [], existed: [], error: "NOTION_TOKEN not set" };
  }

  const n = notion();
  const added: string[] = [];
  const existed: string[] = [];

  try {
    const db = await n.databases.retrieve({ database_id: NOTION_DBS.contacts });
    const existingProps = (db as any).properties ?? {};

    // 1. New props (Closed Reason, Log Actions) — add if missing.
    const propsToAdd: Record<string, any> = {};
    for (const [name, schema] of Object.entries(CRM_PROPERTIES_TO_ADD)) {
      if (name === "Actions") continue;  // handled separately (multi-select merge)
      if (existingProps[name]) {
        existed.push(name);
      } else {
        propsToAdd[name] = schema;
      }
    }

    // 2. Actions multi_select: merge options if already present, create if not.
    const actionsProp = existingProps["Actions"];
    let mergedOptions = SALES_ACTION_ITEMS;
    if (!actionsProp) {
      propsToAdd["Actions"] = CRM_PROPERTIES_TO_ADD["Actions"];
    } else if (actionsProp.type === "multi_select") {
      const existingOpts: { name: string; id?: string }[] = actionsProp.multi_select?.options ?? [];
      const existingNames = new Set(existingOpts.map((o) => o.name));
      const toAdd = SALES_ACTION_ITEMS.filter((n) => !existingNames.has(n));
      if (toAdd.length > 0) {
        const merged = [
          ...existingOpts.map((o) => (o.id ? { id: o.id, name: o.name } : { name: o.name })),
          ...toAdd.map((name) => ({ name })),
        ];
        propsToAdd["Actions"] = { multi_select: { options: merged } };
        mergedOptions = merged.map((o) => o.name);
      } else {
        existed.push("Actions");
        mergedOptions = existingOpts.map((o) => o.name);
      }
    } else {
      existed.push(`Actions (as ${actionsProp.type}, not multi_select — left alone)`);
    }

    if (Object.keys(propsToAdd).length > 0) {
      await n.dataSources.update({
        data_source_id: NOTION_DATA_SOURCES.contacts,
        properties: propsToAdd as any,
      } as any);
      added.push(...Object.keys(propsToAdd));
    }

    return { added, existed, mergedActionsOptions: mergedOptions };
  } catch (err: any) {
    return { added, existed, error: err?.message || String(err) };
  }
}

// Ensures the Content Calendar has a "Type" select column populated with
// every Type value the Market or Die log modal offers (post / video / short
// / carousel / story / blog_post / etc.). Preserves any options already
// present in Notion (e.g. custom genre values like "storytelling") so no
// data is lost.
export async function setupNotionContentColumns(): Promise<SetupResult & { mergedTypeOptions?: string[] }> {
  if (!isNotionConfigured()) {
    return { added: [], existed: [], error: "NOTION_TOKEN not set" };
  }

  const n = notion();
  const added: string[] = [];
  const existed: string[] = [];

  // The items our Market or Die log modal expects to find in the Notion
  // Content Calendar's Type column. Uses the human-readable labels.
  const desiredTypeOptions = ALL_KINDS.map((k) => k.label);

  try {
    const db = await n.databases.retrieve({ database_id: NOTION_DBS.content });
    const props = (db as any).properties ?? {};
    const typeProp = props["Type"];

    if (!typeProp) {
      // Column doesn't exist — create as a select with all our options.
      await n.dataSources.update({
        data_source_id: NOTION_DATA_SOURCES.content,
        properties: {
          Type: { select: { options: desiredTypeOptions.map((name) => ({ name })) } },
        } as any,
      } as any);
      added.push("Type");
      return { added, existed, mergedTypeOptions: desiredTypeOptions };
    }

    // Column exists. If it's a select, merge our options in without removing
    // any existing ones.
    if (typeProp.type !== "select") {
      existed.push(`Type (as ${typeProp.type})`);
      return { added, existed, error: `Type column already exists as '${typeProp.type}', not 'select' — leaving alone` };
    }

    const existingOpts: { name: string; color?: string; id?: string }[] = typeProp.select?.options ?? [];
    const existingNames = new Set(existingOpts.map((o) => o.name));
    const toAdd = desiredTypeOptions.filter((n) => !existingNames.has(n));

    if (toAdd.length === 0) {
      existed.push("Type");
      return { added, existed, mergedTypeOptions: existingOpts.map((o) => o.name) };
    }

    // Notion API: to add options to a select we send the FULL desired
    // options array (existing + new). Existing options need to be preserved
    // by id so the color and rows using them aren't lost.
    const mergedOptions = [
      ...existingOpts.map((o) => (o.id ? { id: o.id, name: o.name } : { name: o.name })),
      ...toAdd.map((name) => ({ name })),
    ];
    await n.dataSources.update({
      data_source_id: NOTION_DATA_SOURCES.content,
      properties: {
        Type: { select: { options: mergedOptions } },
      } as any,
    } as any);
    existed.push("Type");
    return { added: toAdd, existed, mergedTypeOptions: mergedOptions.map((o) => o.name) };
  } catch (err: any) {
    return { added, existed, error: err?.message || String(err) };
  }
}
