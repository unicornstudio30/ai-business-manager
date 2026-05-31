// Daily morning briefing for the dashboard.
//
// Approach: feed the LLM ONLY real, current CRM facts (leads, overdue
// follow-ups, stuck deals, active clients going quiet, recent activities).
// The prompt forbids inventing names. When there's truly nothing actionable
// we skip the LLM entirely and render an honest "nothing pressing" message —
// previous behaviour was to call the LLM with an empty payload, which produced
// hallucinated suggestions like "Schedule a sync with Lead Engineer Arjun Singh"
// for contacts that never existed.

import { db, schema } from "../db/client";
import { gte, desc, eq, inArray, isNotNull, lt, and, sql } from "drizzle-orm";
import { cachedChat } from "../ai-cache";
import { MODELS, isOpenRouterConfigured } from "../openrouter";
import { HOT_LEAD_STAGES, ACTIVE_CLIENT_STAGES, TERMINAL_STAGES } from "../stages";

const DAY = 86_400_000;

const SYSTEM = `You are a no-fluff sales coach for Saidur Rahaman, founder of Unicorn Studio (custom AI automation for AI SaaS founders).
You write a tactical morning briefing — 1-3 bullets, each a concrete action for today.

ABSOLUTE RULES (violations make the briefing useless):
- Use ONLY the contact names, statuses, days-overdue, and topics that appear verbatim in the DATA section below.
- NEVER invent names, companies, products, projects, integrations, meetings, or events.
- If a fact is not in the DATA, don't reference it.
- If the DATA section is sparse or contains nothing actionable, output FEWER bullets (or one bullet) — don't pad.

FORMAT:
- Each bullet starts with a one-word imperative verb (Reply, Re-engage, Audit, Skip, Send, Close, Check-in, Nudge).
- One sentence per bullet, max 22 words.
- Reference one specific contact name from the DATA per bullet when possible.
- No headings, no preamble, no signoff. Plain markdown bullets ("- ...").`;

export type DailySummaryResult = {
  summary: string;
  cached: boolean;
  signalsUsed: number;       // how many real facts grounded the briefing
  generatedAt: string;
};

// Pull the most action-relevant snapshot of the CRM. Each section returns a
// short list of real facts; the prompt joins them into a context block the
// LLM is anchored to.
async function gatherSignals() {
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d11Ago = new Date(now - 11 * DAY);
  const d30Ago = new Date(now - 30 * DAY);

  // 1. Hot leads — contacts at Lead / Qualified / Proposal / Booking stages,
  //    sorted by oldest statusDate so the most stale ones surface first.
  const leads = await db
    .select({
      id: schema.contacts.id,
      name: schema.contacts.name,
      status: schema.contacts.status,
      statusDate: schema.contacts.statusDate,
      platform: schema.contacts.platform,
    })
    .from(schema.contacts)
    .where(inArray(schema.contacts.status, [...HOT_LEAD_STAGES]))
    .orderBy(schema.contacts.statusDate)
    .limit(8);

  // 2. Overdue follow-ups — followUpDate < today, not terminal
  const overdue = await db
    .select({
      id: schema.contacts.id,
      name: schema.contacts.name,
      status: schema.contacts.status,
      followUpDate: schema.contacts.followUpDate,
    })
    .from(schema.contacts)
    .where(and(
      isNotNull(schema.contacts.followUpDate),
      lt(schema.contacts.followUpDate, today),
      sql`(${schema.contacts.status} NOT IN (${sql.join(TERMINAL_STAGES.map((s) => sql`${s}`), sql`, `)}))`
    ))
    .orderBy(schema.contacts.followUpDate)
    .limit(6);

  // 3. Clients going quiet — Partnership stage, no touch in 30+ days
  const quietClients = await db
    .select({
      id: schema.contacts.id,
      name: schema.contacts.name,
      lastTouchAt: schema.contacts.lastTouchAt,
    })
    .from(schema.contacts)
    .where(and(
      inArray(schema.contacts.status, [...ACTIVE_CLIENT_STAGES]),
      lt(schema.contacts.lastTouchAt, d30Ago)
    ))
    .limit(4);

  // 4. Recent activities (last 24h) — what already happened to mention
  const since24h = new Date(now - DAY);
  const recentActivities = await db
    .select({
      type: schema.activities.type,
      contactId: schema.activities.contactId,
      content: schema.activities.content,
      createdAt: schema.activities.createdAt,
    })
    .from(schema.activities)
    .where(gte(schema.activities.createdAt, since24h))
    .orderBy(desc(schema.activities.createdAt))
    .limit(20);

  // Resolve contact names for any contact-bound activities
  const actContactIds = Array.from(
    new Set(recentActivities.map((a) => a.contactId).filter((id): id is string => !!id))
  );
  const actContactRows = actContactIds.length
    ? await db
        .select({ id: schema.contacts.id, name: schema.contacts.name })
        .from(schema.contacts)
        .where(inArray(schema.contacts.id, actContactIds))
    : [];
  const actContactName = new Map(actContactRows.map((c) => [c.id, c.name]));

  return { leads, overdue, quietClients, recentActivities, actContactName, now };
}

function daysAgo(d: Date | null | undefined, now: number): number | null {
  if (!d) return null;
  return Math.floor((now - d.getTime()) / DAY);
}

function buildPrompt(s: Awaited<ReturnType<typeof gatherSignals>>): {
  context: string;
  signalsCount: number;
} {
  const lines: string[] = [];
  let count = 0;

  if (s.overdue.length > 0) {
    lines.push("OVERDUE FOLLOW-UPS (highest priority):");
    for (const c of s.overdue) {
      const lateDays = c.followUpDate ? daysAgo(c.followUpDate, s.now) : null;
      lines.push(`  - ${c.name} | status=${c.status ?? "—"} | ${lateDays !== null ? `${lateDays}d overdue` : "(no date)"}`);
      count++;
    }
    lines.push("");
  }

  if (s.leads.length > 0) {
    lines.push("HOT LEADS (sorted by stalest):");
    for (const c of s.leads) {
      const age = daysAgo(c.statusDate, s.now);
      lines.push(`  - ${c.name} | status=${c.status ?? "—"} | ${age !== null ? `${age}d in stage` : "—"} | platform=${c.platform ?? "—"}`);
      count++;
    }
    lines.push("");
  }

  if (s.quietClients.length > 0) {
    lines.push("ACTIVE CLIENTS GOING QUIET (30+ days no touch):");
    for (const c of s.quietClients) {
      const days = daysAgo(c.lastTouchAt, s.now);
      lines.push(`  - ${c.name} | ${days !== null ? `${days}d no touch` : "(never)"}`);
      count++;
    }
    lines.push("");
  }

  if (s.recentActivities.length > 0) {
    lines.push("LAST 24h ACTIVITIES:");
    for (const a of s.recentActivities) {
      const who = a.contactId ? s.actContactName.get(a.contactId) ?? "(unknown)" : "(no contact)";
      const snippet = (a.content ?? "").slice(0, 100).replace(/\n+/g, " ");
      lines.push(`  - ${a.type} → ${who}: ${snippet}`);
      count++;
    }
    lines.push("");
  }

  return { context: lines.join("\n").trim(), signalsCount: count };
}

export async function getDailySummary(): Promise<DailySummaryResult | null> {
  if (!isOpenRouterConfigured()) return null;

  const signals = await gatherSignals();
  const { context, signalsCount } = buildPrompt(signals);

  // No real data to brief on — return an honest empty-state instead of
  // letting the LLM hallucinate.
  if (signalsCount === 0) {
    return {
      summary: "- Nothing pressing today. Empty inbox is a feature, not a bug — invest the time in pipeline-building (Connect tab) or content.",
      cached: false,
      signalsUsed: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Date: ${today}

DATA (use only what's here — do not invent names or topics):

${context}

Write the briefing now. Up to 3 bullets, fewer if the data only supports fewer.`;

  const { text, cached } = await cachedChat(prompt, {
    model: MODELS.prose,
    systemPrompt: SYSTEM,
    temperature: 0.3,
    maxTokens: 240,
    ttlSeconds: 4 * 60 * 60,        // 4h instead of 24h so it refreshes during the day
  });

  return {
    summary: text.trim(),
    cached,
    signalsUsed: signalsCount,
    generatedAt: new Date().toISOString(),
  };
}
