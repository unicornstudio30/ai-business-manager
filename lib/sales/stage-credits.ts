// CRM Status → Sell or Die credit. The per-stage mapping lives in
// lib/stage-config.ts (STAGE_TO_SALES); the stage list comes from Notion.
// Auto-sync uses this to credit stage flips; the manual log modal shows every
// Notion stage in a dropdown so the two paths stay in lockstep.
//
// Points assume LinkedIn channel (multiplier 1.0). Manual logs can pick a
// different channel to apply the channel multiplier.

import { STAGE_TO_SALES } from "../stage-config";
import { canonicalStage } from "../stages";
import { pointsFor as salesPointsFor, type ActivityKind as SalesKind, type Channel as SalesChannel } from "./points";

export { STAGE_TO_SALES };

export type StageCredit = { stage: string; kind: SalesKind | null; label: string };

// Every stage, in the order given (pass getStages() for Notion's order).
export function stageCreditList(stages: readonly string[]): StageCredit[] {
  return stages.map((s) => ({ stage: s, kind: kindForStage(s), label: s }));
}

// Preview: what points will `stage` earn on `channel`? Returns 0 for stages
// that don't earn credit.
export function pointsForStage(stage: string, channel: SalesChannel = "linkedin"): number {
  const kind = kindForStage(stage);
  if (!kind) return 0;
  return salesPointsFor(channel, kind, 1);
}

// The kind a stage maps to, or null if the stage doesn't earn credit.
export function kindForStage(stage: string | null | undefined): SalesKind | null {
  if (!stage) return null;
  return STAGE_TO_SALES[canonicalStage(stage)] ?? null;
}
