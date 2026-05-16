// Server-side version of the /next-message slash command. Same logic — fetches
// a contact, looks up their next sequence step from lib/sequences.ts, drafts
// an ACA message in Saidur's voice via OpenRouter, optionally saves it as a
// 'dm_sent' draft activity. Callable from anywhere with HTTP (Claude.ai via
// MCP tool, the dashboard, scripts).

import { db, schema } from "../db/client";
import { eq, desc } from "drizzle-orm";
import { chat, MODELS, isOpenRouterConfigured } from "../openrouter";
import { nextStep, trackForPlatform, getSequence, type SequenceTrack, type SequenceStep } from "../sequences";

const SYSTEM = `You are Saidur Rahaman, founder of Unicorn Studio — custom AI automation, integrations, AI SaaS builds, websites, and branding for AI SaaS founders and B2B SMBs.

Voice: confident, specific, never salesy. Lead with the prospect's situation, not the offer. Always use ACA (Acknowledge → Compliment → Ask). Never pitch in the first message of a sequence — earn the conversation first. Reference custom-built (vs template) as the key differentiator when relevant. Mention the 3–4 clients/month capacity cap when it strengthens credibility.

You draft ONE message at a time, matching the exact intent of the requested sequence step. No greeting other than the prospect's first name when appropriate to the channel. No signoff blocks. Just the message body.`;

export type NextMessageResult = {
  contact: { id: string; name: string; status: string | null; platform: string | null };
  track: SequenceTrack;
  currentStep: number;
  nextStep: SequenceStep | null;
  isFinal: boolean;
  draft: string | null;
  daysSinceLastTouch: number | null;
  earliestSendDate: string | null;  // ISO date YYYY-MM-DD or null
  tooSoon: boolean;
  activityId: string | null;        // populated if save=true
};

export async function generateNextMessage(opts: {
  contactId: string;
  save?: boolean;   // if true, write to activities feed as dm_sent draft
}): Promise<NextMessageResult | null> {
  if (!isOpenRouterConfigured()) return null;

  const contact = (await db.select().from(schema.contacts).where(eq(schema.contacts.id, opts.contactId)).limit(1))[0];
  if (!contact) return null;

  const track: SequenceTrack = (contact.sequenceTrack === "facebook" || contact.sequenceTrack === "linkedin")
    ? contact.sequenceTrack
    : trackForPlatform(contact.platform);

  const currentStep = contact.engageTouch ?? 0;
  const { next, isFinal } = nextStep(track, currentStep);
  const seq = getSequence(track);

  // Days since last touch
  const lastTouchTs = contact.lastTouchAt?.getTime() ?? contact.statusDate?.getTime() ?? null;
  const daysSinceLastTouch = lastTouchTs ? Math.floor((Date.now() - lastTouchTs) / (24 * 60 * 60 * 1000)) : null;
  const tooSoon = next != null && daysSinceLastTouch != null && daysSinceLastTouch < next.dayOffsetFromPrev;
  const earliestSendDate = next && lastTouchTs
    ? new Date(lastTouchTs + next.dayOffsetFromPrev * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null;

  let draft: string | null = null;
  let activityId: string | null = null;

  if (next) {
    // Pull last 5 activities for context (helps the LLM be specific)
    const recent = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.contactId, contact.id))
      .orderBy(desc(schema.activities.createdAt))
      .limit(5);

    const activityLines = recent.length === 0
      ? "(none recorded)"
      : recent.map((a) => `- ${a.type}: ${(a.content ?? "").slice(0, 150).replace(/\n+/g, " ")}`).join("\n");

    let position: string[] = [];
    let profession: string[] = [];
    try { position = contact.position ? JSON.parse(contact.position) : []; } catch {}
    try { profession = contact.profession ? JSON.parse(contact.profession) : []; } catch {}

    const prompt = `Contact:
- Name: ${contact.name || "(unknown)"}
- Stage: ${contact.status ?? "(unknown)"}
- Country: ${contact.country ?? "(unknown)"}
- Platform: ${contact.platform ?? "(unknown)"} (sequence track: ${track})
- Position: ${position.join(", ") || "(unknown)"}
- Profession: ${profession.join(", ") || "(unknown)"}
- Website: ${contact.websiteUrl ?? "(none)"}
- Remarks: ${contact.remarks ?? "(none)"}
- Sequence progress: step ${currentStep}/${seq.length} on the ${track} track
- Last touch: ${daysSinceLastTouch ?? "?"}d ago

Recent activities (newest first):
${activityLines}

Sequence step to draft NOW (step ${next.step}/${seq.length}):
- Brief: ${next.brief}
- Channel: ${next.channel}
- Detailed intent: ${next.promptHint}
- Target CRM stage after sending: ${next.targetStatus}

Draft the message body now. Single message, ACA structure, voiced as Saidur. No greeting other than first name if natural. No signoff. Make it specific to THIS contact — use one detail from their profile or recent activities.`;

    draft = (await chat(prompt, {
      model: MODELS.fast,
      systemPrompt: SYSTEM,
      temperature: 0.7,
      maxTokens: 350,
    })).trim();

    if (opts.save && draft) {
      const [row] = await db
        .insert(schema.activities)
        .values({
          contactId: contact.id,
          type: "dm_sent",
          content: draft,
        })
        .returning({ id: schema.activities.id });
      activityId = row.id;
    }
  }

  return {
    contact: { id: contact.id, name: contact.name, status: contact.status, platform: contact.platform },
    track,
    currentStep,
    nextStep: next,
    isFinal,
    draft,
    daysSinceLastTouch,
    earliestSendDate,
    tooSoon,
    activityId,
  };
}
