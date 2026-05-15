// Discovery-call prep brief — pulls together what you need to walk into
// the call prepared. Pure server-side: meeting + contact + last activities
// + stage-aware talking points + Unicorn elevator pitch.
//
// Returned as structured data; the /meetings/[id]/brief page renders it.
// MCP tool prep_brief returns the same structure — Claude can polish it
// into a narrative if asked.

import { db, schema } from "./db/client";
import { eq, desc } from "drizzle-orm";
import { computeLeadScore } from "./lead-scoring";
import type { Meeting, Contact, Activity } from "./db/schema";

// Stage-aware discovery questions, drawn from /strategy/unicorn-sales-playbook.md.
// Each list is what to focus on if the contact is in that stage when the call lands.
const STAGE_QUESTIONS: Record<string, string[]> = {
  "Lead": [
    "What sparked your interest in AI automation right now?",
    "What's the workflow that costs you the most time today?",
    "Where in your stack does intelligence not yet live?",
  ],
  "1st Lead Follow up": [
    "Last we spoke you mentioned [X]. Has anything changed since?",
    "What's the biggest constraint stopping you from acting on this?",
  ],
  "2nd Lead Follow up": [
    "If we built one specific thing in the next 60 days, what would it be?",
    "Walk me through what 'success' looks like 6 months from now.",
  ],
  "Qualified": [
    "What does the buying process look like on your side?",
    "Who else needs to be in the loop?",
    "What would make this a 'no-brainer yes' for you?",
  ],
  "Booking": [
    "Confirm: 30 minutes works on your side?",
    "Any specific scenarios you'd like me to be ready to walk through?",
  ],
  "First call": [
    "What does success look like 6 months out?",
    "What's blocked you from solving this internally?",
    "Walk me through your current stack and where the friction is.",
    "If we built [X] in 6-8 weeks, what would change about your business?",
    "What's your biggest concern about working with an outside partner?",
  ],
};

const COMMON_OBJECTIONS = [
  {
    objection: "Your price is too high",
    response: "I hear you. You clearly know your margins. What's the cost of staying in this state for another 6 months — including your time, the missed revenue, and the team capacity? If that number's higher than our scope, the math gets straightforward.",
  },
  {
    objection: "We're not ready right now",
    response: "Totally fair. Sounds like things are running smooth. Can I check back in 30 days? And do you know anyone else who's feeling the AI gap right now?",
  },
  {
    objection: "We can build this with our team",
    response: "Sure, in-house is real. Most teams who try this underestimate the prompt iteration cycle, not the code. Want to walk through what specifically blocks most in-house attempts?",
  },
  {
    objection: "We've been burned by AI consultants before",
    response: "Completely valid. The fact that you're cautious means you take outcomes seriously. That's exactly why we guarantee the first build — built and running, or we work free.",
  },
];

const UNICORN_30SEC_PITCH = `Unicorn Studio builds custom AI systems for SaaS founders and B2B teams.

Six lines: AI Systems · AI Integrations · AI Solutions · AI SaaS · Website · Branding.

Three differentiators:
  1. Custom-built — we don't pick from a menu
  2. Built and running, or we work free (full setup-fee refund)
  3. Deployed to YOUR cloud, accounts, secrets manager — you own everything

Capacity: 3-4 new clients/month. Typical build: 5-8 weeks. Scope + timeline + price in writing before any work begins.`;

export type PrepBrief = {
  meeting: Meeting;
  contact: Contact | null;
  recentActivities: Activity[];
  leadScore: { score: number; breakdown: Record<string, number> } | null;
  audits: any[];
  questions: string[];
  objectionBank: typeof COMMON_OBJECTIONS;
  pitch: string;
  generatedAt: Date;
};

export async function buildPrepBrief(meetingId: string): Promise<PrepBrief | null> {
  const [meeting] = await db
    .select()
    .from(schema.meetings)
    .where(eq(schema.meetings.id, meetingId))
    .limit(1);
  if (!meeting) return null;

  const contact = meeting.contactId
    ? (await db.select().from(schema.contacts).where(eq(schema.contacts.id, meeting.contactId)).limit(1))[0] ?? null
    : null;

  const recentActivities = contact
    ? await db
        .select()
        .from(schema.activities)
        .where(eq(schema.activities.contactId, contact.id))
        .orderBy(desc(schema.activities.createdAt))
        .limit(15)
    : [];

  let leadScore: PrepBrief["leadScore"] = null;
  if (contact) {
    const breakdown = computeLeadScore(contact, recentActivities);
    leadScore = {
      score: breakdown.score,
      breakdown: {
        stage: breakdown.stageWeight,
        recency: breakdown.recencyScore,
        engagement: breakdown.engagementScore,
        reply: breakdown.replyScore,
      },
    };
  }

  const audits = contact
    ? await db.select().from(schema.audits).where(eq(schema.audits.contactId, contact.id))
    : [];

  // Pick questions for the contact's current stage; default to First call set.
  const stage = contact?.status ?? "First call";
  const questions = STAGE_QUESTIONS[stage] ?? STAGE_QUESTIONS["First call"];

  return {
    meeting,
    contact,
    recentActivities,
    leadScore,
    audits,
    questions,
    objectionBank: COMMON_OBJECTIONS,
    pitch: UNICORN_30SEC_PITCH,
    generatedAt: new Date(),
  };
}
