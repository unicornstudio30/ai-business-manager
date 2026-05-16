// LLM-based ICP classifier. Reads a contact's profile and returns a short tag
// + a one-line reason. Stored on the contact row (icpClassification +
// icpClassifiedAt). Designed for Unicorn Studio's ICP: AI SaaS founders and
// B2B SMBs that need custom AI automation.

import { db, schema } from "../db/client";
import { eq, isNull, sql } from "drizzle-orm";
import { cachedChat } from "../ai-cache";
import { MODELS, isOpenRouterConfigured } from "../openrouter";

const SYSTEM = `You classify prospects against Unicorn Studio's ICP.
ICP = AI SaaS founders, or B2B SMBs that would benefit from custom AI automation / integrations / websites / branding.
NOT ICP = students, job seekers, agencies that compete (other automation shops), random consumers.

Return ONLY a single line in this exact format:
<TAG> — <one-line reason, max 12 words>

Where <TAG> is one of: Hot, Warm, Cold, Not ICP.
Examples:
Hot — AI SaaS founder, US, recently raised, posts about ops bottlenecks
Warm — B2B SMB owner, looks open to automation but unclear budget
Cold — adjacent role but no clear AI need
Not ICP — another automation agency, would compete`;

export type IcpResult = {
  contactId: string;
  classification: string;
  cached: boolean;
};

export async function classifyContact(contactId: string): Promise<IcpResult | null> {
  if (!isOpenRouterConfigured()) return null;

  const contact = (await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId)).limit(1))[0];
  if (!contact) return null;

  let position: string[] = [];
  let profession: string[] = [];
  try { position = contact.position ? JSON.parse(contact.position) : []; } catch {}
  try { profession = contact.profession ? JSON.parse(contact.profession) : []; } catch {}

  const prompt = `Contact:
- Name: ${contact.name || "(unknown)"}
- Country: ${contact.country ?? "(unknown)"}
- Platform: ${contact.platform ?? "(unknown)"}
- Position: ${position.join(", ") || "(unknown)"}
- Profession: ${profession.join(", ") || "(unknown)"}
- Website: ${contact.websiteUrl ?? "(none)"}
- Remarks: ${contact.remarks ?? "(none)"}

Classify per the rules.`;

  const { text, cached } = await cachedChat(prompt, {
    model: MODELS.fast,
    systemPrompt: SYSTEM,
    temperature: 0.2,
    maxTokens: 60,
    ttlSeconds: 30 * 24 * 60 * 60,   // 30 days — contact profile rarely changes
  });

  const classification = text.trim().split("\n")[0].slice(0, 200);

  await db
    .update(schema.contacts)
    .set({ icpClassification: classification, icpClassifiedAt: new Date() })
    .where(eq(schema.contacts.id, contactId));

  return { contactId, classification, cached };
}

// Classify up to `limit` contacts that have no classification yet. Used by the
// /api/ai/classify-pending route which the SyncButton fires best-effort.
export async function classifyPending(limit = 10): Promise<{
  classified: number;
  errors: { contactId: string; error: string }[];
}> {
  if (!isOpenRouterConfigured()) return { classified: 0, errors: [] };
  const pending = await db
    .select({ id: schema.contacts.id })
    .from(schema.contacts)
    .where(isNull(schema.contacts.icpClassification))
    .orderBy(sql`${schema.contacts.createdAt} DESC`)
    .limit(limit);

  let classified = 0;
  const errors: { contactId: string; error: string }[] = [];
  for (const c of pending) {
    try {
      const result = await classifyContact(c.id);
      if (result) classified++;
    } catch (err: any) {
      errors.push({ contactId: c.id, error: err?.message || String(err) });
      // Stop early if we're being rate-limited — don't burn the rest of the limit
      if (err?.message?.includes("429") || err?.message?.includes("rate")) break;
    }
  }
  return { classified, errors };
}
