// "Sell or Die" point system. Same shape as lib/marketing/points.ts.
// Rewards conversion work: outreach that turns into meetings, meetings that
// turn into proposals, proposals that close.

export type Channel =
  | "linkedin"
  | "email"
  | "phone"
  | "zoom"
  | "in_person"
  | "facebook"
  | "x"
  | "instagram"
  | "whatsapp"
  | "other";

export type ActivityKind =
  | "dm_sent"            // outbound DM / cold message
  | "connection_request" // sent a connection request (LinkedIn / X)
  | "reply_sent"         // replied inside an ongoing conversation
  | "follow_up"          // scheduled follow-up touch
  | "discovery_call"     // qualifying conversation
  | "demo"               // product demo delivered
  | "pricing_call"       // negotiation / pricing conversation
  | "proposal_sent"      // proposal delivered
  | "contract_sent"      // contract delivered
  | "objection_handled"  // productive objection convo
  | "referral_asked"     // asked existing client / contact for a referral
  | "referral_received"  // got a warm intro
  | "close_won"          // deal closed
  | "close_lost"         // deal died — log for learning
  | "other";

// Base per-unit point value. Multiplied by count when logging.
const BASE_POINTS: Record<ActivityKind, number> = {
  dm_sent:             3,
  connection_request:  2,
  reply_sent:          3,
  follow_up:           5,
  discovery_call:     60,
  demo:               80,
  pricing_call:       50,
  proposal_sent:     100,
  contract_sent:     150,
  objection_handled:  20,
  referral_asked:     15,
  referral_received:  80,   // earned trust
  close_won:         500,   // the whole point
  close_lost:         20,   // learning is valuable
  other:              10,
};

// Channel multiplier — reflects effort/friction. In-person > Zoom > phone > DM.
const CHANNEL_MULTIPLIER: Record<Channel, number> = {
  linkedin:    1.0,
  email:       1.0,
  phone:       1.1,
  zoom:        1.2,
  in_person:   1.4,
  facebook:    1.0,
  x:           0.9,
  instagram:   1.0,
  whatsapp:    1.0,
  other:       1.0,
};

export function pointsFor(channel: Channel, kind: ActivityKind, count = 1): number {
  const base = BASE_POINTS[kind] ?? BASE_POINTS.other;
  const mult = CHANNEL_MULTIPLIER[channel] ?? 1.0;
  return Math.max(1, Math.round(base * mult * count));
}

// Level thresholds by lifetime sales points. Different scale from marketing —
// closing 1 deal a month ≈ 2,000 pts/month, so L4 (20k lifetime) ≈ 10 months
// of consistent closing. Adjust as your team ramps.
export type Level = 1 | 2 | 3 | 4;

export function levelFromLifetimePoints(lifetime: number): Level {
  if (lifetime >= 25_000) return 4;
  if (lifetime >= 8_000)  return 3;
  if (lifetime >= 2_000)  return 2;
  return 1;
}

export const DEFAULT_TARGET_BY_LEVEL: Record<Level, number> = {
  1: 300,     // ~1 discovery + 30 DMs + follow-ups
  2: 800,     // ~1 demo + 1 discovery + 50 outreach
  3: 2_000,   // ~1 proposal + 1 demo + 2 discoveries + 80 outreach
  4: 5_000,   // ~1 close + heavier late-funnel work
};

export function defaultTargetFor(lifetime: number): number {
  return DEFAULT_TARGET_BY_LEVEL[levelFromLifetimePoints(lifetime)];
}

export const ALL_KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: "dm_sent",             label: "DM sent" },
  { kind: "connection_request",  label: "Connection request" },
  { kind: "reply_sent",          label: "Reply sent" },
  { kind: "follow_up",           label: "Follow-up touch" },
  { kind: "discovery_call",      label: "Discovery call" },
  { kind: "demo",                label: "Demo delivered" },
  { kind: "pricing_call",        label: "Pricing / negotiation" },
  { kind: "proposal_sent",       label: "Proposal sent" },
  { kind: "contract_sent",       label: "Contract sent" },
  { kind: "objection_handled",   label: "Objection handled" },
  { kind: "referral_asked",      label: "Referral asked" },
  { kind: "referral_received",   label: "Referral received" },
  { kind: "close_won",           label: "Close · Won" },
  { kind: "close_lost",          label: "Close · Lost (log for learning)" },
  { kind: "other",               label: "Other" },
];

export const ALL_CHANNELS: { channel: Channel; label: string }[] = [
  { channel: "linkedin",  label: "LinkedIn" },
  { channel: "email",     label: "Email" },
  { channel: "phone",     label: "Phone" },
  { channel: "zoom",      label: "Zoom" },
  { channel: "in_person", label: "In-person" },
  { channel: "facebook",  label: "Facebook" },
  { channel: "x",         label: "X" },
  { channel: "instagram", label: "Instagram" },
  { channel: "whatsapp",  label: "WhatsApp" },
  { channel: "other",     label: "Other" },
];

// Reuse the week-bucketing helpers from marketing/points.ts so all three
// leaderboards align on the same Monday-UTC week boundaries.
export { addWeeks, fmtWeekLabel, weekStartFor } from "../marketing/points";
