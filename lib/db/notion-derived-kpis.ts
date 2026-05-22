// Comprehensive Notion-derived KPI engine.
//
// Every counter, suggestion, and chart in the dashboard reads from here.
// We derive from contact state — Status, Status Date, Engage Touch, Follow-up
// Date, Closed date, Relation, Category, Platform, etc. — not from manually
// entered numbers. The Notion CRM is the ONLY source of truth.
//
// Why this matters:
//   - Status moved Prospect → 1st message on statusDate=today = connection req sent
//   - Status → Booking on statusDate=today = meeting booked today
//   - Status → Proposal Sent on statusDate=today = proposal sent today
//   - closedDate=today + status=Partnership = deal won today
//   - Relation column gained "lead magnet" today (via inferred activities) = magnet sent
//
// Output: a fully-derived DerivedKpis snapshot for any given day.

import { db, schema } from "./client";
import { and, gte, lt, eq, inArray, sql } from "drizzle-orm";
import { platformToChannel, type InboxChannel } from "../inbox";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}

// Stage groupings from the 18-stage pipeline
const CONNECTION_STAGES = ["1st message"];                                                                      // initial outreach
const ENGAGED_STAGES = ["Lead", "1st Lead Follow up", "2nd Lead Follow up"];
const QUALIFIED_STAGE = "Qualified";
const PROPOSAL_STAGE = "Proposal Sent";
const BOOKING_STAGE = "Booking";
const FIRST_CALL_STAGE = "First call";
const WIN_STAGE = "Partnership";
const LOSS_STAGES = ["Lost", "Closed without Partnership", "Not qualified", "Close"];
const PROSPECT_FOLLOW_UPS = ["1st Prospect Follow-up", "2nd Prospect Follow up"];
const LEAD_FOLLOW_UPS = ["1st Lead Follow up", "2nd Lead Follow up"];
const POST_PROPOSAL_FOLLOW_UPS = ["Post Proposal Follow-up-1", "Post Proposal Follow-up-2"];
const ALL_FOLLOW_UP_STAGES = [...PROSPECT_FOLLOW_UPS, ...LEAD_FOLLOW_UPS, ...POST_PROPOSAL_FOLLOW_UPS];

export type ByPlatform = Partial<Record<InboxChannel, number>>;

export type DerivedKpis = {
  date: Date;

  // Outreach (sent/done today, derived from statusDate)
  connectionsSent: { total: number; byPlatform: ByPlatform };
  followUpsSent: { total: number; byPlatform: ByPlatform };
  // Comments / engagement actions today, derived from Engage Touch increments
  // captured by the inferred-activities engine on Notion sync.
  commentsToday: { total: number; byPlatform: ByPlatform };
  leadMagnetsSent: number;
  conversationsOpened: number;
  responsesReceived: number;

  // Outcomes today
  qualifications: number;
  proposalsSent: number;
  bookings: number;
  callsHeld: number;
  dealsWon: number;
  dealsLost: number;

  // New into the pipeline today
  newProspects: number;
  inboundLeads: number;

  // Today's events
  meetingsToday: { id: string; name: string; status: string; statusDate: Date | null; platform: string | null }[];
  newConnectionsToday: { id: string; name: string; platform: string | null }[];
  newProposalsToday: { id: string; name: string; statusDate: Date | null }[];

  // Pipeline state (snapshot)
  pipeline: {
    total: number;
    cold: number;        // Prospect, 1st message, prospect follow-ups
    engaged: number;     // Lead + lead follow-ups
    qualified: number;
    proposal: number;    // Proposal Sent, post-proposal follow-ups
    booking: number;     // Booking + First call
    closed: number;      // Partnership + losses (sum)
  };

  // Overdue follow-ups (Follow-up Date is in the past, status not closed)
  followUpsOverdue: { id: string; name: string; status: string; followUpDate: Date | null; daysLate: number }[];

  // Counts
  totalActions: number;       // connections + follow-ups + magnets + conversations
  totalOutcomes: number;      // responses + qualifications + proposals + bookings + calls + wins + losses

  // Conversion rate (today)
  responseRate: number | null;    // responses / connectionsSent

  // Multi-channel pursuit (contacts where Cross outreach has 2+ values)
  multiChannelContacts: { id: string; name: string; channels: string[]; status: string }[];

  // Sequence step distribution — how many contacts are at each engageTouch (1-5)
  // Helps spot where prospects stall in the cadence.
  engageTouchDistribution: Record<string, number>;  // {"0": 12, "1": 8, "2": 5, ...}
};

function platformOf(p: string | null): InboxChannel | null {
  return p ? platformToChannel(p) : null;
}

function bumpPlatform(map: ByPlatform, p: InboxChannel | null) {
  if (!p) return;
  map[p] = (map[p] ?? 0) + 1;
}

export async function getNotionDerivedKpis(forDate: Date): Promise<DerivedKpis> {
  const start = startOfDay(forDate);
  const end = endOfDay(forDate);

  // Pull all contacts once — we'll filter in memory by date conditions.
  // For a single-user CRM this is fine (few hundred to few thousand rows).
  const contacts = await db.select().from(schema.contacts);

  // ─── Outreach actions today (derived from statusDate + current status) ───

  const connectionsSent = { total: 0, byPlatform: {} as ByPlatform };
  const followUpsSent = { total: 0, byPlatform: {} as ByPlatform };
  const newConnectionsToday: DerivedKpis["newConnectionsToday"] = [];
  const newProposalsToday: DerivedKpis["newProposalsToday"] = [];
  const meetingsToday: DerivedKpis["meetingsToday"] = [];

  let responsesReceived = 0;
  let qualifications = 0;
  let proposalsSent = 0;
  let bookings = 0;
  let callsHeld = 0;
  let dealsWon = 0;
  let dealsLost = 0;
  let newProspects = 0;
  let inboundLeads = 0;

  const pipeline = { total: 0, cold: 0, engaged: 0, qualified: 0, proposal: 0, booking: 0, closed: 0 };

  const followUpsOverdue: DerivedKpis["followUpsOverdue"] = [];

  // NEW: cross-outreach + engage touch distribution
  const multiChannelContacts: DerivedKpis["multiChannelContacts"] = [];
  const engageTouchDistribution: Record<string, number> = {};

  for (const c of contacts) {
    const status = c.status ?? "";
    const sd = c.statusDate;
    const cd = c.closedDate;
    const fud = c.followUpDate;
    const saved = c.savedDate;
    const inDay = (d: Date | null | undefined) => !!d && d >= start && d < end;
    const channel = platformOf(c.platform);

    // ─ Pipeline snapshot ─
    if (status) {
      pipeline.total++;
      if (status === "Prospect" || status === "1st message" || PROSPECT_FOLLOW_UPS.includes(status)) pipeline.cold++;
      else if (ENGAGED_STAGES.includes(status)) pipeline.engaged++;
      else if (status === QUALIFIED_STAGE) pipeline.qualified++;
      else if (status === PROPOSAL_STAGE || POST_PROPOSAL_FOLLOW_UPS.includes(status)) pipeline.proposal++;
      else if (status === BOOKING_STAGE || status === FIRST_CALL_STAGE) pipeline.booking++;
      else if (status === WIN_STAGE || LOSS_STAGES.includes(status)) pipeline.closed++;
    }

    // ─ New prospects today (savedDate is today) ─
    if (inDay(saved)) {
      newProspects++;
      if (c.category) {
        try {
          const cats: string[] = JSON.parse(c.category);
          if (cats.some((x) => x.toLowerCase() === "inbound")) inboundLeads++;
        } catch { /* ignore */ }
      }
    }

    // ─ Outreach derived from statusDate ─
    if (inDay(sd)) {
      // Connection request (Status = "1st message" + statusDate = today)
      if (CONNECTION_STAGES.includes(status)) {
        connectionsSent.total++;
        bumpPlatform(connectionsSent.byPlatform, channel);
        newConnectionsToday.push({ id: c.id, name: c.name || "(no name)", platform: c.platform });
      }
      // Follow-up sent (any follow-up stage + statusDate = today)
      if (ALL_FOLLOW_UP_STAGES.includes(status)) {
        followUpsSent.total++;
        bumpPlatform(followUpsSent.byPlatform, channel);
      }
      // Response received (moved INTO a Lead/Qualified stage today)
      if (ENGAGED_STAGES.includes(status) || status === QUALIFIED_STAGE) {
        responsesReceived++;
      }
      if (status === QUALIFIED_STAGE) qualifications++;
      if (status === PROPOSAL_STAGE) {
        proposalsSent++;
        newProposalsToday.push({ id: c.id, name: c.name || "(no name)", statusDate: sd });
      }
      if (status === BOOKING_STAGE) {
        bookings++;
        meetingsToday.push({ id: c.id, name: c.name || "(no name)", status, statusDate: sd, platform: c.platform });
      }
      if (status === FIRST_CALL_STAGE) {
        callsHeld++;
        meetingsToday.push({ id: c.id, name: c.name || "(no name)", status, statusDate: sd, platform: c.platform });
      }
    }

    // ─ Closed today (closedDate is today) ─
    if (inDay(cd)) {
      if (status === WIN_STAGE) dealsWon++;
      else if (LOSS_STAGES.includes(status)) dealsLost++;
    }

    // ─ Cross outreach: contacts with 2+ channels in Notion's Cross outreach multi-select ─
    if (c.crossOutreach) {
      try {
        const channels: string[] = JSON.parse(c.crossOutreach);
        if (Array.isArray(channels) && channels.length >= 2 && status !== WIN_STAGE && !LOSS_STAGES.includes(status)) {
          multiChannelContacts.push({
            id: c.id,
            name: c.name || "(no name)",
            channels,
            status,
          });
        }
      } catch { /* ignore non-JSON */ }
    }

    // ─ Engage Touch distribution (only count contacts still in active pipeline) ─
    if (status && status !== WIN_STAGE && !LOSS_STAGES.includes(status)) {
      const touch = String(c.engageTouch ?? 0);
      engageTouchDistribution[touch] = (engageTouchDistribution[touch] ?? 0) + 1;
    }

    // ─ Overdue follow-ups (followUpDate < today + status not closed/won) ─
    if (fud && fud < start && status !== WIN_STAGE && !LOSS_STAGES.includes(status)) {
      const daysLate = Math.floor((start.getTime() - fud.getTime()) / 86400000);
      followUpsOverdue.push({
        id: c.id,
        name: c.name || "(no name)",
        status,
        followUpDate: fud,
        daysLate,
      });
    }
  }

  followUpsOverdue.sort((a, b) => b.daysLate - a.daysLate);

  // ─── Lead magnets sent today + conversations opened today ───
  // These come from inferred activities (created when Relation column gained values).
  const relationActivities = await db
    .select()
    .from(schema.activities)
    .where(and(
      gte(schema.activities.createdAt, start),
      lt(schema.activities.createdAt, end),
      eq(schema.activities.type, "note")
    ));
  let leadMagnetsSent = 0;
  let conversationsOpened = 0;
  for (const a of relationActivities) {
    const body = a.content ?? "";
    if (body.includes("Relation added")) {
      if (body.includes("lead magnet")) leadMagnetsSent++;
      if (body.includes("Open Conversation")) conversationsOpened++;
    }
  }

  // ─── Comments today = Engage Touch increments today ───
  // The inferred-activities engine emits a dm_sent activity each time
  // Engage Touch ticks up on a synced contact. We count those (filtered by
  // content prefix to exclude manually-logged DMs) as "engagement actions".
  const touchActivities = await db
    .select()
    .from(schema.activities)
    .where(and(
      gte(schema.activities.createdAt, start),
      lt(schema.activities.createdAt, end),
      eq(schema.activities.type, "dm_sent")
    ));
  const commentsToday = { total: 0, byPlatform: {} as ByPlatform };
  for (const a of touchActivities) {
    if (!a.content?.includes("Engage Touch")) continue;
    commentsToday.total++;
    if (a.channel) bumpPlatform(commentsToday.byPlatform, a.channel as InboxChannel);
  }

  const totalActions = connectionsSent.total + followUpsSent.total + commentsToday.total + leadMagnetsSent + conversationsOpened;
  const totalOutcomes = responsesReceived + qualifications + proposalsSent + bookings + callsHeld + dealsWon + dealsLost;
  const responseRate = connectionsSent.total === 0 ? null : Math.round((responsesReceived / connectionsSent.total) * 100);

  // Sort multi-channel by count desc
  multiChannelContacts.sort((a, b) => b.channels.length - a.channels.length);

  return {
    date: start,
    connectionsSent,
    followUpsSent,
    commentsToday,
    leadMagnetsSent,
    conversationsOpened,
    responsesReceived,
    qualifications,
    proposalsSent,
    bookings,
    callsHeld,
    dealsWon,
    dealsLost,
    newProspects,
    inboundLeads,
    meetingsToday,
    newConnectionsToday,
    newProposalsToday,
    pipeline,
    followUpsOverdue,
    totalActions,
    totalOutcomes,
    responseRate,
    multiChannelContacts,
    engageTouchDistribution,
  };
}
