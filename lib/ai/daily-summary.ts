// Daily morning summary: feeds the last 24h of activities to an LLM and
// returns a tight markdown briefing for the dashboard. Cached 24h.

import { db, schema } from "../db/client";
import { gte, desc, eq, inArray } from "drizzle-orm";
import { cachedChat } from "../ai-cache";
import { MODELS, isOpenRouterConfigured } from "../openrouter";

const SYSTEM = `You write tight, no-fluff morning briefings for Saidur Rahaman, founder of Unicorn Studio (custom AI automation for AI SaaS founders).
Output exactly 3 bullets. Each bullet:
- Starts with a one-word verb (e.g., "Reply", "Audit", "Skip").
- Is one sentence, max 18 words.
- Names a specific contact / project / topic when the data supports it.
No headings, no preamble, no signoff. Markdown bullets only.`;

export type DailySummaryResult = {
  summary: string;
  cached: boolean;
  activityCount: number;
  generatedAt: string;
};

// Top-of-window summary, key = today's UTC date so the cache rolls over at midnight UTC.
export async function getDailySummary(): Promise<DailySummaryResult | null> {
  if (!isOpenRouterConfigured()) return null;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db
    .select()
    .from(schema.activities)
    .where(gte(schema.activities.createdAt, since))
    .orderBy(desc(schema.activities.createdAt))
    .limit(40);

  // Pull contact names for the activities so the LLM has real names to mention.
  const contactIds = Array.from(new Set(recent.map((a) => a.contactId).filter((id): id is string => !!id)));
  const contactRows = contactIds.length > 0
    ? await db.select({ id: schema.contacts.id, name: schema.contacts.name, status: schema.contacts.status })
        .from(schema.contacts)
        .where(inArray(schema.contacts.id, contactIds))
    : [];
  const byId = new Map(contactRows.map((c) => [c.id, c]));

  const lines = recent.map((a) => {
    const c = a.contactId ? byId.get(a.contactId) : null;
    const who = c ? `${c.name}${c.status ? ` [${c.status}]` : ""}` : "(no contact)";
    const snippet = (a.content ?? "").slice(0, 140).replace(/\n+/g, " ");
    return `• ${a.type} → ${who}: ${snippet}`;
  });

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Date: ${today}
Activities in the last 24h (${recent.length}):
${lines.length > 0 ? lines.join("\n") : "(none)"}

Write the 3-bullet briefing now.`;

  const { text, cached } = await cachedChat(prompt, {
    model: MODELS.prose,
    systemPrompt: SYSTEM,
    temperature: 0.4,
    maxTokens: 200,
    ttlSeconds: 24 * 60 * 60,
  });

  return {
    summary: text.trim(),
    cached,
    activityCount: recent.length,
    generatedAt: new Date().toISOString(),
  };
}
