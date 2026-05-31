// Unicorn Studio's Notion CRM pipeline.
// Order matters: stages flow from coldest (top) to closed (bottom).
// Single source of truth — UI, API, and Notion sync all import from here.
//
// Keep aligned with the Status select options in your Notion CRM database.
// Legacy spellings (e.g. "In-mail") are aliased in lib/notion/contacts-mapper.ts.

export const STAGES = [
  // ── Cold: first-touch progression ──
  "Prospect",
  "Connection request",
  "Connected",
  "1st message",
  "Inmail",
  "1st Prospect Follow-up",
  "2nd Prospect Follow up",
  // ── Engaged: replies + qualification ──
  "Lead",
  "1st Lead Follow up",
  "2nd Lead Follow up",
  "Qualified",
  "Not qualified",
  // ── Proposal + close ──
  "Proposal Sent",
  "Post Proposal Follow-up-1",
  "Post Proposal Follow-up-2",
  "Booking",
  "First call",
  // ── Outcomes ──
  "Closed without Partnership",
  "Partnership",
  "Lost",
  "Follow up later",
] as const;

export type Stage = (typeof STAGES)[number];

// Dashboard groupings — collapse stages into the chart bars
export const STAGE_GROUPS = {
  Cold: ["Prospect", "Connection request", "Connected", "1st message", "Inmail", "1st Prospect Follow-up", "2nd Prospect Follow up"],
  Engaged: ["Lead", "1st Lead Follow up", "2nd Lead Follow up"],
  Qualified: ["Qualified", "Not qualified"],
  Proposal: ["Proposal Sent", "Post Proposal Follow-up-1", "Post Proposal Follow-up-2"],
  Call: ["Booking", "First call"],
  Won: ["Partnership"],
  Archive: ["Closed without Partnership", "Lost", "Follow up later"],
} as const satisfies Record<string, readonly Stage[]>;

export type StageGroup = keyof typeof STAGE_GROUPS;

// The cards on the home dashboard
export const HOT_LEAD_STAGES: Stage[] = [
  "Lead",
  "1st Lead Follow up",
  "2nd Lead Follow up",
  "Qualified",
  "Proposal Sent",
  "Post Proposal Follow-up-1",
  "Post Proposal Follow-up-2",
  "Booking",
  "First call",
];

export const ACTIVE_CLIENT_STAGES: Stage[] = ["Partnership"];

export const TERMINAL_STAGES: Stage[] = [
  "Closed without Partnership",
  "Lost",
  "Not qualified",
];

// Stages that should NOT trigger the follow-up queue / cadence engine.
// Inmail is a one-shot cold message (no connection needed) — if they don't
// reply, we let them die quietly instead of chasing.
export const NO_FOLLOW_UP_STAGES: Stage[] = ["Inmail"];

// Tailwind color tokens per stage (UI badges)
export const STAGE_COLORS: Record<Stage, string> = {
  "Prospect": "bg-red-100 text-red-800 border-red-200",
  "Connection request": "bg-sky-100 text-sky-800 border-sky-200",
  "Connected": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "1st message": "bg-purple-100 text-purple-800 border-purple-200",
  "Inmail": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "1st Prospect Follow-up": "bg-pink-100 text-pink-800 border-pink-200",
  "2nd Prospect Follow up": "bg-gray-100 text-gray-800 border-gray-200",
  "Lead": "bg-green-100 text-green-800 border-green-200",
  "1st Lead Follow up": "bg-orange-100 text-orange-800 border-orange-200",
  "2nd Lead Follow up": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Qualified": "bg-blue-100 text-blue-800 border-blue-200",
  "Not qualified": "bg-purple-100 text-purple-800 border-purple-200",
  "Proposal Sent": "bg-green-100 text-green-800 border-green-200",
  "Post Proposal Follow-up-1": "bg-orange-100 text-orange-800 border-orange-200",
  "Post Proposal Follow-up-2": "bg-teal-100 text-teal-800 border-teal-200",
  "Booking": "bg-amber-100 text-amber-800 border-amber-200",
  "First call": "bg-blue-100 text-blue-800 border-blue-200",
  "Closed without Partnership": "bg-slate-100 text-slate-700 border-slate-200",
  "Partnership": "bg-violet-100 text-violet-800 border-violet-200",
  "Lost": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Follow up later": "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export function stageGroup(status: string | null | undefined): StageGroup | null {
  if (!status) return null;
  for (const [group, members] of Object.entries(STAGE_GROUPS)) {
    if ((members as readonly string[]).includes(status)) return group as StageGroup;
  }
  return null;
}

export function isHotLead(status: string | null | undefined): boolean {
  return !!status && HOT_LEAD_STAGES.includes(status as Stage);
}

export function isActiveClient(status: string | null | undefined): boolean {
  return !!status && ACTIVE_CLIENT_STAGES.includes(status as Stage);
}

export function isTerminal(status: string | null | undefined): boolean {
  return !!status && TERMINAL_STAGES.includes(status as Stage);
}

export function isExcludedFromFollowUp(status: string | null | undefined): boolean {
  return !!status && NO_FOLLOW_UP_STAGES.includes(status as Stage);
}
