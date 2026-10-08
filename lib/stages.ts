// Stage helpers for PBM's reporting.
//
// The stage list and order live in Notion (Sales CRM "Status" options) and are
// read at runtime by lib/notion/stage-source.ts (getStages()). How PBM
// interprets each stage lives in lib/stage-config.ts. This module only derives
// helpers from that config; it holds no stage names of its own.

import {
  GROUP_COLORS,
  STAGE_ALIASES,
  STAGE_GROUP_OF,
  STAGE_GROUP_ORDER,
  STAGE_ROLES,
  UNGROUPED_COLOR,
  type StageGroup,
} from "./stage-config";

export type { StageGroup } from "./stage-config";
export { STAGE_GROUP_ORDER, FUNNEL_GROUPS, STAGE_ROLES } from "./stage-config";

// Stages are plain strings — Notion owns the set.
export type Stage = string;

export function canonicalStage(raw: string): string {
  return STAGE_ALIASES[raw] ?? raw;
}

// Every configured stage per group (includes legacy names so old rows still
// count). For only the stages that exist in Notion today, use
// getStageDefinitions() in lib/notion/stage-source.ts.
export const STAGE_GROUPS: Record<StageGroup, string[]> = Object.fromEntries(
  STAGE_GROUP_ORDER.map((g) => [g, Object.keys(STAGE_GROUP_OF).filter((s) => STAGE_GROUP_OF[s] === g)])
) as Record<StageGroup, string[]>;

export function stageGroup(status: string | null | undefined): StageGroup | null {
  if (!status) return null;
  return STAGE_GROUP_OF[canonicalStage(status)] ?? null;
}

export function stagesInGroups(groups: readonly StageGroup[]): string[] {
  return groups.flatMap((g) => STAGE_GROUPS[g]);
}

export const TERMINAL_STAGES: string[] = [...STAGE_ROLES.loss, ...STAGE_ROLES.disqualified];
export const NO_FOLLOW_UP_STAGES: string[] = [...STAGE_ROLES.noFollowUp];
export const WIN_STAGES: string[] = STAGE_GROUPS.Won;

// Active pipeline (replied → call), excluding disqualified.
export const HOT_LEAD_STAGES: string[] = stagesInGroups(["Engaged", "Qualified", "Proposal", "Call"]).filter(
  (s) => !TERMINAL_STAGES.includes(s)
);

// Won stages count as active clients.
export const ACTIVE_CLIENT_STAGES: string[] = WIN_STAGES;

export function hasRole(status: string | null | undefined, role: keyof typeof STAGE_ROLES): boolean {
  return !!status && (STAGE_ROLES[role] as readonly string[]).includes(canonicalStage(status));
}

export function isWon(status: string | null | undefined): boolean {
  return stageGroup(status) === "Won";
}

export function isHotLead(status: string | null | undefined): boolean {
  return !!status && HOT_LEAD_STAGES.includes(canonicalStage(status));
}

export function isActiveClient(status: string | null | undefined): boolean {
  return isWon(status);
}

export function isTerminal(status: string | null | undefined): boolean {
  return !!status && TERMINAL_STAGES.includes(canonicalStage(status));
}

// Won, lost or disqualified — no longer in the active pipeline.
export const CLOSED_STAGES: string[] = [...WIN_STAGES, ...TERMINAL_STAGES];
export function isClosed(status: string | null | undefined): boolean {
  return isWon(status) || isTerminal(status);
}

export function isExcludedFromFollowUp(status: string | null | undefined): boolean {
  return hasRole(status, "noFollowUp");
}

export function stageColor(status: string | null | undefined): string {
  const g = stageGroup(status);
  return g ? GROUP_COLORS[g] : UNGROUPED_COLOR;
}
