// Lead scoring — pure function. No DB access here; caller passes the data in.
//
// Score breakdown (0–100):
//   stage_weight     (0–40)  — where they are in the 18-stage pipeline
//   recency          (0–25)  — days since their last activity / status change
//   engagement       (0–20)  — count of activities in the last 30 days
//   reply_ratio      (0–15)  — % of outbound activities that triggered an inbound reply
//
// Higher is hotter. Sort the engagement queue by this score descending.

import type { Contact, Activity } from "./db/schema";
import { isTerminal, type Stage } from "./stages";

const STAGE_WEIGHTS: Record<string, number> = {
  "Prospect": 5,
  "1st message": 8,
  "1st Prospect Follow-up": 10,
  "2nd Prospect Follow up": 12,
  "Lead": 20,
  "1st Lead Follow up": 22,
  "2nd Lead Follow up": 24,
  "Qualified": 30,
  "Not qualified": 0,
  "Proposal Sent": 35,
  "Post Proposal Follow-up-1": 33,
  "Post Proposal Follow-up-2": 30,
  "Booking": 38,
  "First call": 40,
  "Closed without Partnership": 0,
  "Partnership": 0, // active client — different KPI
  "Lost": 0,
  "Follow up later": 8,
};

const OUTBOUND_TYPES = new Set(["dm_sent", "email_drafted", "follow_up_sent", "comment_drafted"]);
const INBOUND_TYPES = new Set(["note"]); // inbound replies logged as notes for now

export type LeadScoreBreakdown = {
  score: number;
  stageWeight: number;
  recencyScore: number;
  engagementScore: number;
  replyScore: number;
};

export function computeLeadScore(
  contact: Pick<Contact, "status" | "statusDate" | "lastTouchAt">,
  activities: Pick<Activity, "type" | "createdAt">[],
  now: Date = new Date()
): LeadScoreBreakdown {
  if (isTerminal(contact.status)) {
    return { score: 0, stageWeight: 0, recencyScore: 0, engagementScore: 0, replyScore: 0 };
  }

  // Stage weight
  const stageWeight = STAGE_WEIGHTS[contact.status ?? ""] ?? 0;

  // Recency — days since most recent of: lastTouchAt, statusDate, latest activity
  const lastDates = [
    contact.lastTouchAt,
    contact.statusDate,
    activities[0]?.createdAt, // activities passed in newest-first
  ].filter((d): d is Date => d instanceof Date);
  let recencyScore = 0;
  if (lastDates.length > 0) {
    const latest = Math.max(...lastDates.map((d) => d.getTime()));
    const days = Math.floor((now.getTime() - latest) / 86400000);
    if (days < 3) recencyScore = 25;
    else if (days < 7) recencyScore = 20;
    else if (days < 14) recencyScore = 12;
    else if (days < 30) recencyScore = 5;
    else recencyScore = 0;
  }

  // Engagement — activities in last 30 days
  const thirtyDaysAgo = now.getTime() - 30 * 86400000;
  const recent = activities.filter((a) => a.createdAt && a.createdAt.getTime() > thirtyDaysAgo);
  let engagementScore = 0;
  if (recent.length >= 6) engagementScore = 20;
  else if (recent.length >= 3) engagementScore = 15;
  else if (recent.length >= 1) engagementScore = 8;

  // Reply ratio — outbound vs inbound
  const outbound = recent.filter((a) => OUTBOUND_TYPES.has(a.type)).length;
  const inbound = recent.filter((a) => INBOUND_TYPES.has(a.type)).length;
  let replyScore = 0;
  if (outbound > 0) {
    const ratio = inbound / outbound;
    if (ratio >= 0.5) replyScore = 15;
    else if (ratio >= 0.25) replyScore = 10;
    else if (ratio >= 0.1) replyScore = 5;
  }

  const score = Math.min(100, stageWeight + recencyScore + engagementScore + replyScore);
  return { score, stageWeight, recencyScore, engagementScore, replyScore };
}

// Convenience: score a single contact by fetching its activities from a list.
export function scoreContactWithActivities(
  contact: Contact,
  allActivities: Activity[]
): LeadScoreBreakdown {
  const own = allActivities
    .filter((a) => a.contactId === contact.id)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  return computeLeadScore(contact, own);
}

// Visual hint for UI
export function scoreColor(score: number): string {
  if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
  if (score >= 50) return "text-orange-700 bg-orange-50 border-orange-200";
  if (score >= 30) return "text-amber-700 bg-amber-50 border-amber-200";
  if (score >= 15) return "text-stone-700 bg-stone-50 border-stone-200";
  return "text-stone-400 bg-stone-50 border-stone-200";
}
