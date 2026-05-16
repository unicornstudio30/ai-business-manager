// Per-contact "what to send next" suggestion for stuck deals. Cached 24h
// per contact (free-tier rate-limit aware).

import { db, schema } from "../db/client";
import { eq, desc } from "drizzle-orm";
import { cachedChat } from "../ai-cache";
import { MODELS, isOpenRouterConfigured } from "../openrouter";

const SYSTEM = `You are a B2B sales coach. Saidur Rahaman runs Unicorn Studio — custom AI automation for AI SaaS founders.
You suggest a single next-message action for a stuck deal. Output ONE sentence, max 22 words.
Start with a verb. Be specific to the contact's stage + last interaction. No fluff, no preamble.
If unsure what to send, suggest the smallest re-engagement step (curiosity question, value resource, polite check-in).`;

export type StuckSuggestion = {
  text: string;
  cached: boolean;
};

export async function getStuckSuggestion(contactId: string): Promise<StuckSuggestion | null> {
  if (!isOpenRouterConfigured()) return null;

  const contact = (await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId)).limit(1))[0];
  if (!contact) return null;

  // Pull a few recent activities so the LLM knows what's been said
  const activities = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.contactId, contactId))
    .orderBy(desc(schema.activities.createdAt))
    .limit(5);

  const activitySummary = activities.length === 0
    ? "(none recorded)"
    : activities.map((a) => {
        const snippet = (a.content ?? "").slice(0, 120).replace(/\n+/g, " ");
        return `- ${a.type}: ${snippet}`;
      }).join("\n");

  const prompt = `Contact: ${contact.name}
Stage: ${contact.status ?? "(unknown)"}
Platform: ${contact.platform ?? "(unknown)"}
Profession: ${contact.profession ?? "(unknown)"}
Remarks: ${contact.remarks ?? "(none)"}
Recent activities:
${activitySummary}

What should Saidur send next? One sentence.`;

  const { text, cached } = await cachedChat(prompt, {
    model: MODELS.fast,
    systemPrompt: SYSTEM,
    temperature: 0.5,
    maxTokens: 80,
    ttlSeconds: 24 * 60 * 60,
  });

  return { text: text.trim().replace(/^["']|["']$/g, ""), cached };
}
