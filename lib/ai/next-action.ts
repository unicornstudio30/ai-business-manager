// One-sentence "what should I do next?" for any contact, regardless of stage.
// Stuck contacts get one suggestion via lib/ai/stuck-suggestion.ts; active
// contacts get a different framing here (move sequence forward, schedule, etc.).
// Cached 12h per contact (free-tier rate-limit aware).

import { db, schema } from "../db/client";
import { eq, desc } from "drizzle-orm";
import { cachedChat } from "../ai-cache";
import { MODELS, isOpenRouterConfigured } from "../openrouter";
import { trackForPlatform, nextStep, getSequence } from "../sequences";

const SYSTEM = `You are a B2B sales coach. Saidur Rahaman runs Unicorn Studio — custom AI automation for AI SaaS founders.
You suggest ONE next action for a contact. Output ONE sentence, max 22 words. Start with a verb.

Pick the highest-leverage move given:
- Their stage in the 18-stage pipeline
- Whether the DM sequence has unsent steps (suggest the next step number)
- Whether you're past a follow-up date (suggest a re-engagement angle)
- Whether they're in Partnership (suggest retention / upsell)
- Whether they're Lost / Not qualified (suggest archive or long-term nurture)

No fluff. No preamble.`;

export type NextActionResult = {
  text: string;
  cached: boolean;
};

export async function getNextAction(contactId: string): Promise<NextActionResult | null> {
  if (!isOpenRouterConfigured()) return null;

  const contact = (await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId)).limit(1))[0];
  if (!contact) return null;

  const track = (contact.sequenceTrack === "linkedin" || contact.sequenceTrack === "facebook")
    ? contact.sequenceTrack
    : trackForPlatform(contact.platform);
  const seq = getSequence(track);
  const { next: nextSeqStep } = nextStep(track, contact.engageTouch ?? 0);

  // Pull last 5 activities for context
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

  const followUpDue = contact.followUpDate && contact.followUpDate < new Date();

  const prompt = `Contact: ${contact.name}
Stage: ${contact.status ?? "(unknown)"}
Platform: ${contact.platform ?? "(unknown)"} (sequence: ${track})
Sequence progress: step ${contact.engageTouch ?? 0}/${seq.length} ${nextSeqStep ? `(next: step ${nextSeqStep.step} — ${nextSeqStep.brief})` : "(sequence exhausted)"}
Follow-up date: ${contact.followUpDate ? contact.followUpDate.toISOString().slice(0, 10) : "(none)"}${followUpDue ? " ⚠ PAST DUE" : ""}
Last touch: ${contact.lastTouchAt ? contact.lastTouchAt.toISOString().slice(0, 10) : "(unknown)"}
ICP: ${contact.icpClassification ?? "(not classified)"}
Remarks: ${contact.remarks ?? "(none)"}

Recent activities:
${activitySummary}

What's the single best next action for Saidur? One sentence.`;

  const { text, cached } = await cachedChat(prompt, {
    model: MODELS.fast,
    systemPrompt: SYSTEM,
    temperature: 0.5,
    maxTokens: 80,
    ttlSeconds: 12 * 60 * 60,
  });

  return { text: text.trim().replace(/^["']|["']$/g, ""), cached };
}
