// Stage configuration — the ONLY file in PBM that names CRM stages.
//
// The list of stages and their order come from Notion at runtime (the
// "Status" multi_select options on the Sales CRM; see
// lib/notion/stage-source.ts). This file only says how PBM interprets a stage:
// which dashboard group it belongs to and which reporting roles it plays.
//
// When a new stage is added in Notion, add it to STAGE_GROUP_OF below. Until
// then it shows up in stage_definitions as "ungrouped", is left out of funnel
// groups, and a warning is logged on every stage refresh.

import type { ActivityKind as SalesKind } from "./sales/points";

// Name of the Notion property that holds the stage (users call it "Stage").
export const STAGE_PROPERTY = "Status";

export const STAGE_GROUP_ORDER = ["Cold", "Engaged", "Qualified", "Proposal", "Call", "Won", "Archive"] as const;
export type StageGroup = (typeof STAGE_GROUP_ORDER)[number];

// Funnel groups shown on the dashboard (Archive is excluded from the funnel).
export const FUNNEL_GROUPS: StageGroup[] = ["Cold", "Engaged", "Qualified", "Proposal", "Call", "Won"];

// Stage → dashboard group.
export const STAGE_GROUP_OF: Record<string, StageGroup> = {
  // Cold
  "Prospect": "Cold",
  "Inmail": "Cold",
  "Connection request": "Cold",
  "Connected": "Cold",
  "1st message": "Cold",
  "1st Prospect Follow-up": "Cold",
  "2nd Prospect Follow up": "Cold",
  // Engaged
  "Lead": "Engaged",
  "1st Lead Follow up": "Engaged",
  "2nd Lead Follow up": "Engaged",
  // Qualified
  "Qualified": "Qualified",
  "Not qualified": "Qualified",
  // Proposal
  "Proposal Sent": "Proposal",
  "Post Proposal Follow-up-1": "Proposal",
  "Post Proposal Follow-up-2": "Proposal",
  // Call
  "Booking": "Call",
  "First call": "Call",
  // Won
  "Close": "Won",
  "White Label Partner": "Won",
  "Sales Partner": "Won",
  // Archive
  "Closed Lost": "Archive",
  "Lost": "Archive",
  "Follow up later": "Archive",
  "Nurture": "Archive",
  // Legacy values that are no longer Notion options. Kept so old rows still
  // land in the right group; they never trigger the "ungrouped" warning.
  "Partnership": "Won",
  "Closed without Partnership": "Archive",
};

// Legacy spellings Notion may still emit → current stage name.
export const STAGE_ALIASES: Record<string, string> = {
  "In-mail": "Inmail",
};

// Reporting roles. Membership is explicit so a renamed or new stage never
// silently changes a KPI.
export const STAGE_ROLES = {
  // Contacts PBM hasn't reached out to yet.
  notContacted: ["Prospect"],
  // Moving into these today counts as a connection request / first DM sent.
  connectionSent: ["1st message"],
  inmailSent: ["Inmail"],
  // Waiting on the prospect after a touch.
  waiting: ["1st message", "1st Prospect Follow-up", "2nd Prospect Follow up"],
  // Moving into these means the prospect replied.
  replied: ["Lead", "1st Lead Follow up", "2nd Lead Follow up", "Qualified"],
  followUp: [
    "1st Prospect Follow-up", "2nd Prospect Follow up",
    "1st Lead Follow up", "2nd Lead Follow up",
    "Post Proposal Follow-up-1", "Post Proposal Follow-up-2",
  ],
  qualified: ["Qualified"],
  proposalSent: ["Proposal Sent"],
  booking: ["Booking"],
  firstCall: ["First call"],
  // Closed outcomes (wins are every stage in the Won group).
  loss: ["Lost", "Closed Lost", "Closed without Partnership"],
  disqualified: ["Not qualified"],
  // Never follow up (one-shot cold message).
  noFollowUp: ["Inmail"],
} as const satisfies Record<string, readonly string[]>;

// Sell or Die credit earned when a contact moves into a stage. null = no credit.
// Stages not listed earn nothing.
export const STAGE_TO_SALES: Record<string, SalesKind | null> = {
  "1st message": "dm_sent",
  "Inmail": "dm_sent",
  "Lead": "discovery_call",
  "Qualified": "objection_handled",
  "Not qualified": "objection_handled",
  "Proposal Sent": "proposal_sent",
  "Post Proposal Follow-up-1": "follow_up",
  "Post Proposal Follow-up-2": "follow_up",
  "Booking": "discovery_call",
  "First call": "demo",
  "Close": "close_won",
  "Partnership": "close_won",
  "Closed Lost": "close_lost",
  "Lost": "close_lost",
  "Closed without Partnership": "close_lost",
};

// Stuck-deal thresholds (days without a touch). Per-stage values win; other
// stages fall back to their group's default. Won stages and terminal stages
// are never stuck.
export const STUCK_THRESHOLDS_DAYS: Record<string, number> = {
  "Prospect": 7,
  "1st message": 4,
  "1st Prospect Follow-up": 5,
  "2nd Prospect Follow up": 7,
  "Lead": 4,
  "1st Lead Follow up": 5,
  "2nd Lead Follow up": 7,
  "Qualified": 5,
  "Proposal Sent": 4,                    // Day 3 followup overdue
  "Post Proposal Follow-up-1": 5,        // Day 7 followup overdue
  "Post Proposal Follow-up-2": 7,        // Day 14 close overdue
  "Booking": 2,
  "First call": 3,
  "Follow up later": 30,                 // long tail nurture
  "Nurture": 30,
};
export const STUCK_GROUP_DEFAULT_DAYS: Partial<Record<StageGroup, number>> = {
  Cold: 7,
  Engaged: 5,
  Qualified: 5,
  Proposal: 5,
  Call: 3,
};

export const STUCK_SUGGESTED_ACTIONS: Record<string, string> = {
  "Prospect": "Send the LinkedIn step-1 connection note",
  "1st message": "Engage with 2-3 of their recent posts (LinkedIn step 2)",
  "1st Prospect Follow-up": "Send a value-first DM (LinkedIn step 3)",
  "2nd Prospect Follow up": "Switch channel — send the email case study (step 5)",
  "Lead": "Open-question DM about their AI/automation setup",
  "1st Lead Follow up": "Sharper question about their stated friction",
  "2nd Lead Follow up": "Voice note or short Loom — 60s personalized",
  "Qualified": "Propose a 20-min scoping call this week",
  "Proposal Sent": "Day-3 nudge — anchor on their stated outcome",
  "Post Proposal Follow-up-1": "Day-7 nudge — address the silent objection",
  "Post Proposal Follow-up-2": "Day-14 close — clarify yes / no / timing",
  "Booking": "Confirm time + send 3-question prep form",
  "First call": "Send written scope within 48h",
  "Follow up later": "Light value-add touch — no ask",
  "Nurture": "Light value-add touch — no ask",
};

// Badge colours per group (stages inherit their group's colour).
export const GROUP_COLORS: Record<StageGroup, string> = {
  Cold: "bg-sky-100 text-sky-800 border-sky-200",
  Engaged: "bg-green-100 text-green-800 border-green-200",
  Qualified: "bg-blue-100 text-blue-800 border-blue-200",
  Proposal: "bg-orange-100 text-orange-800 border-orange-200",
  Call: "bg-amber-100 text-amber-800 border-amber-200",
  Won: "bg-violet-100 text-violet-800 border-violet-200",
  Archive: "bg-zinc-100 text-zinc-700 border-zinc-200",
};
export const UNGROUPED_COLOR = "bg-stone-100 text-stone-800 border-stone-200";
