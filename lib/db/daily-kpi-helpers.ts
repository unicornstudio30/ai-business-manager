// Helpers for the redesigned /daily-sales workflow.
// Today's row is fetched / upserted on demand. Breakdown + winAnalysis are
// JSON-encoded blobs; this module hides the JSON parse/stringify dance.

import { db, schema } from "./client";
import { eq, sql } from "drizzle-orm";
import { PLATFORMS_ORDER, type PlatformKey, type ActionKey } from "../sales-limits";

export type BreakdownData = {
  [P in PlatformKey]?: {
    [A in ActionKey]?: number;
  };
};

export type WinAnalysisData = {
  bestChannel?: string;
  bestMessage?: string;
  bestTimeOfDay?: string;
  lossReason?: string;
  objectionsFaced?: string;
  improvementNeeded?: string;
  hotLeadsTomorrow?: string;
  workingTemplates?: string;
  objectionHandlers?: string;
  competitorIntel?: string;
};

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOrCreateTodayRow() {
  const date = todayStart();
  const existing = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(eq(schema.dailySalesKpis.date, date))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(schema.dailySalesKpis).values({ date });
  const rows = await db
    .select()
    .from(schema.dailySalesKpis)
    .where(eq(schema.dailySalesKpis.date, date))
    .limit(1);
  return rows[0];
}

export function parseBreakdown(raw: string | null | undefined): BreakdownData {
  if (!raw) return {};
  try { return JSON.parse(raw) as BreakdownData; } catch { return {}; }
}

export function parseWinAnalysis(raw: string | null | undefined): WinAnalysisData {
  if (!raw) return {};
  try { return JSON.parse(raw) as WinAnalysisData; } catch { return {}; }
}

// Empty breakdown skeleton with all platforms/actions zeroed
export function emptyBreakdown(): BreakdownData {
  const out: BreakdownData = {};
  for (const p of PLATFORMS_ORDER) out[p] = {};
  return out;
}

// Merge a stored breakdown over the empty skeleton — guarantees every platform
// key exists even if the row was created empty.
export function fullBreakdown(raw: string | null | undefined): BreakdownData {
  const empty = emptyBreakdown();
  const parsed = parseBreakdown(raw);
  for (const p of Object.keys(parsed) as PlatformKey[]) {
    empty[p] = { ...empty[p], ...parsed[p] };
  }
  return empty;
}

export async function incrementMetric(opts: {
  platform: PlatformKey;
  action: ActionKey;
  by?: number;
}) {
  const row = await getOrCreateTodayRow();
  const breakdown = parseBreakdown(row.breakdown);
  if (!breakdown[opts.platform]) breakdown[opts.platform] = {};
  const current = (breakdown[opts.platform]![opts.action] as number | undefined) ?? 0;
  const next = Math.max(0, current + (opts.by ?? 1));
  breakdown[opts.platform]![opts.action] = next;

  await db
    .update(schema.dailySalesKpis)
    .set({ breakdown: JSON.stringify(breakdown), updatedAt: new Date() })
    .where(eq(schema.dailySalesKpis.id, row.id));
  return { breakdown, row };
}

export async function setFields(patch: Partial<typeof schema.dailySalesKpis.$inferInsert>) {
  const row = await getOrCreateTodayRow();
  await db
    .update(schema.dailySalesKpis)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.dailySalesKpis.id, row.id));
}

export async function setWinAnalysisField(field: keyof WinAnalysisData, value: string) {
  const row = await getOrCreateTodayRow();
  const wa = parseWinAnalysis(row.winAnalysis);
  wa[field] = value;
  await db
    .update(schema.dailySalesKpis)
    .set({ winAnalysis: JSON.stringify(wa), updatedAt: new Date() })
    .where(eq(schema.dailySalesKpis.id, row.id));
}
