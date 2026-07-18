// CRM Status → Sell or Die credit. Every stage in the Unicorn Studio Sales
// CRM Status column has a corresponding sales kind + point value. Auto-sync
// uses this map to credit stage flips; the manual log modal shows every
// stage in a dropdown so the two paths stay in lockstep.
//
// Points assume LinkedIn channel (multiplier 1.0). Manual logs can pick a
// different channel to apply the channel multiplier.

import type { Stage } from "../stages";
import { STAGES } from "../stages";
import { pointsFor as salesPointsFor, type ActivityKind as SalesKind, type Channel as SalesChannel } from "./points";

export const STAGE_TO_SALES: Record<Stage, SalesKind | null> = {
  // Cold: added but no action yet — don't credit (nothing was "done")
  "Prospect":                    null,
  "Connection request":          null,
  "Connected":                   null,
  // First outbound touch
  "1st message":                 "dm_sent",
  "Inmail":                      "dm_sent",
  // Ongoing prospect follow-ups (activity rows already cover these — don't
  // double-count via stage flips)
  "1st Prospect Follow-up":      null,
  "2nd Prospect Follow up":      null,
  // Engaged
  "Lead":                        "discovery_call",       // they replied / engaged
  "1st Lead Follow up":          null,
  "2nd Lead Follow up":          null,
  "Qualified":                   "objection_handled",
  "Not qualified":               "objection_handled",
  // Proposal + close
  "Proposal Sent":               "proposal_sent",
  "Post Proposal Follow-up-1":   "follow_up",
  "Post Proposal Follow-up-2":   "follow_up",
  "Booking":                     "discovery_call",       // call scheduled
  "First call":                  "demo",                 // call happened
  // Outcomes
  "Closed without Partnership":  "close_lost",
  "Partnership":                 "close_won",
  "Lost":                        "close_lost",
  "Follow up later":             null,
};

// Every stage — display order matches STAGES so the dropdown feels like the
// Notion status column.
export const STAGE_CREDIT_LIST: { stage: Stage; kind: SalesKind | null; label: string }[] = STAGES.map((s) => ({
  stage: s,
  kind: STAGE_TO_SALES[s],
  label: s,
}));

// Preview: what points will `stage` earn on `channel`? Returns 0 for stages
// that don't earn credit (Prospect, follow-up stages, Follow up later).
export function pointsForStage(stage: Stage, channel: SalesChannel = "linkedin"): number {
  const kind = STAGE_TO_SALES[stage];
  if (!kind) return 0;
  return salesPointsFor(channel, kind, 1);
}

// The kind a stage maps to, or null if the stage doesn't earn credit.
export function kindForStage(stage: Stage): SalesKind | null {
  return STAGE_TO_SALES[stage];
}
