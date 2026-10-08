// Reads the CRM stage list from Notion at runtime.
//
// Notion's Sales CRM "Status" options are the single source of truth for which
// stages exist and their order. Cached in memory for a few minutes. If Notion
// can't be reached, falls back to the last good list, then to the distinct
// statuses already in the local mirror.

import { isNotNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import { notion, NOTION_DATA_SOURCES, isNotionConfigured } from "./client";
import { STAGE_GROUP_OF, STAGE_GROUP_ORDER, STAGE_PROPERTY, type StageGroup } from "../stage-config";
import { canonicalStage } from "../stages";

const CACHE_TTL_MS = 5 * 60 * 1000;

export type StageSource = "notion" | "notion_cached" | "local_db";

type CacheEntry = { stages: string[]; source: StageSource; fetchedAt: number };
let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry> | null = null;

async function fetchFromNotion(): Promise<string[]> {
  const ds: any = await notion().dataSources.retrieve({ data_source_id: NOTION_DATA_SOURCES.contacts });
  const prop = ds?.properties?.[STAGE_PROPERTY];
  if (!prop) throw new Error(`Notion CRM has no "${STAGE_PROPERTY}" property`);
  const options: { name: string }[] =
    prop.multi_select?.options ?? prop.select?.options ?? prop.status?.options ?? [];
  if (options.length === 0) throw new Error(`Notion "${STAGE_PROPERTY}" property has no options`);
  return options.map((o) => canonicalStage(o.name));
}

async function fetchFromLocalDb(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ status: schema.contacts.status })
    .from(schema.contacts)
    .where(isNotNull(schema.contacts.status));
  const seen = rows.map((r) => r.status!).filter(Boolean);
  // Order by configured group so the fallback still reads Cold → Archive.
  const rank = (s: string) => {
    const g = STAGE_GROUP_OF[s];
    return g ? STAGE_GROUP_ORDER.indexOf(g) : STAGE_GROUP_ORDER.length;
  };
  return [...new Set(seen)].sort((a, b) => rank(a) - rank(b));
}

function warnUngrouped(stages: string[]) {
  const missing = stages.filter((s) => !STAGE_GROUP_OF[s]);
  if (missing.length > 0) {
    console.warn(
      `[stages] ${missing.length} Notion stage(s) have no group in lib/stage-config.ts: ${missing
        .map((s) => `"${s}"`)
        .join(", ")}. They are left out of funnel groups until mapped.`
    );
  }
}

async function load(): Promise<CacheEntry> {
  if (isNotionConfigured()) {
    try {
      const stages = await fetchFromNotion();
      warnUngrouped(stages);
      return { stages, source: "notion", fetchedAt: Date.now() };
    } catch (err: any) {
      console.warn(`[stages] Reading stages from Notion failed: ${err?.message ?? err}`);
      if (cache) return { ...cache, source: "notion_cached", fetchedAt: Date.now() };
    }
  }
  const stages = await fetchFromLocalDb();
  warnUngrouped(stages);
  return { stages, source: "local_db", fetchedAt: Date.now() };
}

async function getEntry(): Promise<CacheEntry> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (!inflight) {
    inflight = load()
      .then((entry) => (cache = entry))
      .finally(() => (inflight = null));
  }
  return inflight;
}

// Ordered stage names, exactly as Notion lists them.
export async function getStages(): Promise<string[]> {
  return (await getEntry()).stages;
}

export type StageDefinitions = {
  stages: string[];
  stage_groups: Record<StageGroup, string[]>;
  ungrouped: string[];
  source: StageSource;
};

// Notion stages bucketed by dashboard group (in Notion order), plus any
// stages that have no group yet.
export async function getStageDefinitions(): Promise<StageDefinitions> {
  const { stages, source } = await getEntry();
  const stage_groups = Object.fromEntries(STAGE_GROUP_ORDER.map((g) => [g, [] as string[]])) as Record<
    StageGroup,
    string[]
  >;
  const ungrouped: string[] = [];
  for (const s of stages) {
    const g = STAGE_GROUP_OF[s];
    if (g) stage_groups[g].push(s);
    else ungrouped.push(s);
  }
  return { stages, stage_groups, ungrouped, source };
}

// For tests / admin refresh.
export function clearStageCache() {
  cache = null;
}
