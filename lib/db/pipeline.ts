// Pipeline app metrics — per-seat totals pushed by the Unicorn Studio Pipeline
// (~/crm) when Sync is clicked. Numbers only: no message text or names.
//
//   gauge  — where things stood on a date (latest push that day wins)
//   count  — events on a date (Pipeline resends the last 30 days each push,
//            so re-pushing simply overwrites with the same numbers)

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./client";

export const PipelinePayloadSchema = z.object({
  version: z.literal(1),
  generated_at: z.string(),
  own_seat: z.string(),
  seats: z.array(z.object({ name: z.string(), source: z.string() })).max(100),
  metrics: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        seat: z.string().min(1).max(200),
        metric: z.string().min(1).max(200),
        value: z.number().finite(),
        kind: z.enum(["gauge", "count"]),
      })
    )
    .max(50_000),
  freshness: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});
export type PipelinePayload = z.infer<typeof PipelinePayloadSchema>;

export async function ingestPipelinePayload(p: PipelinePayload): Promise<{ metrics: number }> {
  const updatedAt = new Date();
  const rows = p.metrics.map((m) => ({ ...m, value: Math.round(m.value), updatedAt }));
  for (let i = 0; i < rows.length; i += 100) {
    await db
      .insert(schema.pipelineMetrics)
      .values(rows.slice(i, i + 100))
      .onConflictDoUpdate({
        target: [schema.pipelineMetrics.date, schema.pipelineMetrics.seat, schema.pipelineMetrics.metric],
        set: {
          value: sql`excluded.value`,
          kind: sql`excluded.kind`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
  const generated = new Date(p.generated_at);
  await db.insert(schema.pipelinePushes).values({
    generatedAt: isNaN(generated.getTime()) ? null : generated,
    ownSeat: p.own_seat,
    seats: JSON.stringify(p.seats),
    freshness: JSON.stringify(p.freshness),
    metricCount: rows.length,
  });
  return { metrics: rows.length };
}

export type PipelinePushInfo = {
  receivedAt: Date;
  generatedAt: Date | null;
  ownSeat: string | null;
  seats: { name: string; source: string }[];
  freshness: Record<string, string | number | null>;
  metricCount: number;
};

export async function latestPipelinePush(): Promise<PipelinePushInfo | null> {
  const [row] = await db.select().from(schema.pipelinePushes).orderBy(desc(schema.pipelinePushes.receivedAt)).limit(1);
  if (!row) return null;
  const parse = <T,>(s: string | null, fallback: T): T => {
    try {
      return s ? (JSON.parse(s) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    receivedAt: row.receivedAt,
    generatedAt: row.generatedAt,
    ownSeat: row.ownSeat,
    seats: parse(row.seats, []),
    freshness: parse(row.freshness, {}),
    metricCount: row.metricCount,
  };
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export type PipelineSeatSummary = {
  seat: string;
  // Latest value of each gauge metric (from the most recent date it was pushed).
  gauges: Record<string, number>;
  asOf: string | null;
  // Sum of each count metric over the window.
  totals: Record<string, number>;
};

// Latest gauges and windowed totals per seat (or for one seat).
export async function pipelineSummary(opts: { seat?: string | null; days?: number } = {}): Promise<PipelineSeatSummary[]> {
  const days = opts.days ?? 30;
  const since = isoDay(new Date(Date.now() - (days - 1) * 86_400_000));
  const seatCond = opts.seat ? eq(schema.pipelineMetrics.seat, opts.seat) : undefined;

  const [gaugeRows, countRows] = await Promise.all([
    db
      .select()
      .from(schema.pipelineMetrics)
      .where(and(eq(schema.pipelineMetrics.kind, "gauge"), seatCond)),
    db
      .select({
        seat: schema.pipelineMetrics.seat,
        metric: schema.pipelineMetrics.metric,
        total: sql<number>`sum(${schema.pipelineMetrics.value})`,
      })
      .from(schema.pipelineMetrics)
      .where(and(eq(schema.pipelineMetrics.kind, "count"), gte(schema.pipelineMetrics.date, since), seatCond))
      .groupBy(schema.pipelineMetrics.seat, schema.pipelineMetrics.metric),
  ]);

  const bySeat = new Map<string, PipelineSeatSummary>();
  const get = (seat: string) => {
    let s = bySeat.get(seat);
    if (!s) bySeat.set(seat, (s = { seat, gauges: {}, asOf: null, totals: {} }));
    return s;
  };
  // Gauges: keep only the latest date pushed for each seat (a gauge missing
  // from the latest push means it dropped to zero).
  const latestDate = new Map<string, string>();
  for (const r of gaugeRows) {
    if (!latestDate.has(r.seat) || r.date > latestDate.get(r.seat)!) latestDate.set(r.seat, r.date);
  }
  for (const r of gaugeRows) {
    if (r.date !== latestDate.get(r.seat)) continue;
    const s = get(r.seat);
    s.gauges[r.metric] = r.value;
    s.asOf = r.date;
  }
  for (const r of countRows) get(r.seat).totals[r.metric] = Number(r.total ?? 0);
  return [...bySeat.values()].sort((a, b) => a.seat.localeCompare(b.seat));
}

// Daily series for metrics starting with `prefix` (e.g. "messages.sent"),
// summed across matching metrics and (unless a seat is given) across seats.
export async function pipelineDaily(opts: { prefix: string; seat?: string | null; days?: number }) {
  const days = opts.days ?? 30;
  const start = new Date(Date.now() - (days - 1) * 86_400_000);
  const since = isoDay(start);
  const rows = await db
    .select({
      date: schema.pipelineMetrics.date,
      total: sql<number>`sum(${schema.pipelineMetrics.value})`,
    })
    .from(schema.pipelineMetrics)
    .where(
      and(
        eq(schema.pipelineMetrics.kind, "count"),
        gte(schema.pipelineMetrics.date, since),
        sql`(${schema.pipelineMetrics.metric} = ${opts.prefix} OR ${schema.pipelineMetrics.metric} LIKE ${opts.prefix + ".%"})`,
        opts.seat ? eq(schema.pipelineMetrics.seat, opts.seat) : undefined
      )
    )
    .groupBy(schema.pipelineMetrics.date);
  const byDate = new Map(rows.map((r) => [r.date, Number(r.total ?? 0)]));
  return Array.from({ length: days }, (_, i) => {
    const d = isoDay(new Date(start.getTime() + i * 86_400_000));
    return { date: d, value: byDate.get(d) ?? 0 };
  });
}

// Sum of gauges/totals whose metric starts with `prefix`.
export function sumPrefix(values: Record<string, number>, prefix: string): number {
  return Object.entries(values)
    .filter(([k]) => k === prefix || k.startsWith(prefix + "."))
    .reduce((s, [, v]) => s + v, 0);
}
