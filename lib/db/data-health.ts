// Data health: can the reports be trusted right now? Pulls together sync
// freshness, mirror accuracy, stage and seat mapping, stage-history coverage
// and the last Pipeline push.

import { sql } from "drizzle-orm";
import { db, schema } from "./client";
import { syncStatus } from "../notion/sync";
import { getStageDefinitions } from "../notion/stage-source";
import { stageHistoryCoverage } from "../notion/stage-history";
import { listSeats } from "./seats";
import { latestPipelinePush, pipelineSummary, sumPrefix } from "./pipeline";
import { FLAG_DEFAULTS, isEnabled, type FeatureFlag } from "../feature-flags";

export type HealthLevel = "ok" | "warn" | "error";
export type HealthCheck = { key: string; label: string; level: HealthLevel; detail: string };

const hoursSince = (d: Date | null | undefined) => (d ? (Date.now() - d.getTime()) / 3_600_000 : null);

export async function dataHealth() {
  const [sync, stages, coverage, seats, push, summaries, contactCounts] = await Promise.all([
    syncStatus(),
    getStageDefinitions(),
    stageHistoryCoverage(),
    listSeats(),
    latestPipelinePush(),
    pipelineSummary({ days: 1 }),
    db
      .select({
        inNotion: sql<number>`sum(case when ${schema.contacts.inNotion} = 1 then 1 else 0 end)`,
        removed: sql<number>`sum(case when ${schema.contacts.inNotion} = 0 then 1 else 0 end)`,
        noSeat: sql<number>`sum(case when ${schema.contacts.inNotion} = 1 and (${schema.contacts.ownerName} is null or ${schema.contacts.ownerName} = '') then 1 else 0 end)`,
        noStage: sql<number>`sum(case when ${schema.contacts.inNotion} = 1 and ${schema.contacts.status} is null then 1 else 0 end)`,
      })
      .from(schema.contacts),
  ]);
  const counts = contactCounts[0] ?? { inNotion: 0, removed: 0, noSeat: 0, noStage: 0 };

  // Latest successful pull per entity.
  const lastPull: Record<string, { at: Date | null; error: string | null }> = {};
  for (const r of sync.recent) {
    if (r.direction !== "pull" || lastPull[r.entity]) continue;
    lastPull[r.entity] = { at: r.finishedAt ?? null, error: r.error ?? null };
  }

  const pipelineSeats = new Set((push?.seats ?? []).map((s) => s.name));
  const notionSeats = new Set(seats.map((s) => s.name));
  const notionWritesPending = summaries.reduce((s, x) => s + sumPrefix(x.gauges, "notion_writes.total.pending"), 0);

  const checks: HealthCheck[] = [];
  const contactsPull = lastPull["contacts"];
  const pullAge = hoursSince(contactsPull?.at);
  checks.push({
    key: "notion_sync",
    label: "Notion CRM pull",
    level: !sync.configured ? "error" : contactsPull?.error ? "error" : pullAge === null || pullAge > 24 ? "warn" : "ok",
    detail: !sync.configured
      ? "NOTION_TOKEN is not set"
      : contactsPull?.error
        ? `Last pull failed: ${contactsPull.error}`
        : contactsPull?.at
          ? `Last pull ${Math.round(pullAge!)}h ago. Click Sync to refresh.`
          : "Never synced. Click Sync.",
  });
  checks.push({
    key: "mirror",
    label: "Contacts match Notion",
    level: Number(counts.removed) > 0 ? "warn" : "ok",
    detail: `${counts.inNotion} contacts in Notion${
      Number(counts.removed) > 0 ? `; ${counts.removed} no longer in Notion (kept in PBM, left out of reports)` : ""
    }.`,
  });
  checks.push({
    key: "stages",
    label: "Stage mapping",
    level: stages.ungrouped.length > 0 ? "warn" : stages.source === "notion" ? "ok" : "warn",
    detail:
      stages.ungrouped.length > 0
        ? `${stages.ungrouped.length} Notion stage(s) have no group: ${stages.ungrouped.join(", ")}. Add them to lib/stage-config.ts.`
        : `${stages.stages.length} stages read from ${stages.source === "notion" ? "Notion" : "a fallback (" + stages.source + ")"}, all grouped.`,
  });
  const unmapped = seats.filter((s) => !s.user);
  const fuzzy = seats.filter((s) => s.matchedVia === "fuzzy");
  checks.push({
    key: "seats",
    label: "Seat → user mapping",
    level: unmapped.length > 0 ? "warn" : "ok",
    detail:
      unmapped.length > 0
        ? `No app user for: ${unmapped.map((s) => s.name).join(", ")}. Their leaderboards stay empty until mapped in Users & roles.`
        : fuzzy.length > 0
          ? `All seats mapped; ${fuzzy.map((s) => s.name).join(", ")} by fuzzy name match — pin the exact Notion name in Users & roles.`
          : "Every seat maps to an app user.",
  });
  checks.push({
    key: "seat_coverage",
    label: "Contacts with a seat",
    level: Number(counts.noSeat) > 0 ? "warn" : "ok",
    detail:
      Number(counts.noSeat) > 0
        ? `${counts.noSeat} contact(s) have no Seat in Notion and only appear under "All seats".`
        : "Every contact has a Seat.",
  });
  const pushAge = hoursSince(push?.receivedAt);
  checks.push({
    key: "pipeline",
    label: "Pipeline app data",
    level: !push ? "warn" : pushAge! > 72 ? "warn" : "ok",
    detail: !push
      ? "No data from the Pipeline app yet. Open it on your Mac and click Sync."
      : `Last push ${pushAge! < 1 ? "under an hour" : Math.round(pushAge!) + "h"} ago (${push.metricCount} metrics).`,
  });
  const onlyPipeline = [...pipelineSeats].filter((s) => !notionSeats.has(s));
  if (onlyPipeline.length > 0) {
    checks.push({
      key: "seat_drift",
      label: "Seats only in Pipeline",
      level: "ok",
      detail: `${onlyPipeline.join(", ")} ${onlyPipeline.length === 1 ? "has" : "have"} Pipeline/Flow data but no Notion contacts yet.`,
    });
  }
  checks.push({
    key: "history",
    label: "Stage history",
    level: coverage.events === 0 ? "warn" : "ok",
    detail:
      coverage.events === 0
        ? "No stage history yet — it starts on the next Sync."
        : `${coverage.events} events since ${coverage.since?.toISOString().slice(0, 10)} (${coverage.seeded} starting points). Conversion and time-in-stage get more accurate as history builds.`,
  });
  if (notionWritesPending > 0) {
    checks.push({
      key: "notion_writes",
      label: "Pipeline changes waiting for review",
      level: "ok",
      detail: `${notionWritesPending} Notion change(s) are waiting in the Pipeline app's Review tab.`,
    });
  }

  return {
    checks,
    notion: { configured: sync.configured, lastPull },
    contacts: {
      inNotion: Number(counts.inNotion ?? 0),
      removed: Number(counts.removed ?? 0),
      withoutSeat: Number(counts.noSeat ?? 0),
      withoutStage: Number(counts.noStage ?? 0),
    },
    stages: { source: stages.source, count: stages.stages.length, ungrouped: stages.ungrouped },
    seats: seats.map((s) => ({ name: s.name, contacts: s.contactCount, user: s.user, matchedVia: s.matchedVia })),
    stageHistory: coverage,
    pipeline: push
      ? {
          receivedAt: push.receivedAt,
          generatedAt: push.generatedAt,
          freshness: push.freshness,
          seats: push.seats,
          metricCount: push.metricCount,
          notionWritesPending,
        }
      : null,
    flags: (Object.keys(FLAG_DEFAULTS) as FeatureFlag[]).map((f) => ({ flag: f, enabled: isEnabled(f) })),
  };
}

export type DataHealth = Awaited<ReturnType<typeof dataHealth>>;
