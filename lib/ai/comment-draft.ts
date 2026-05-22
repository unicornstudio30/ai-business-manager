// Draft an ACA comment on a prospect's post — usable when you're NOT using
// Taplio/Tweethunter's commenting features and want the Business Manager to
// do the work. Voiced as Saidur, never salesy, references the post specifics.

import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import { chat, MODELS, isOpenRouterConfigured } from "../openrouter";

const SYSTEM = `You are Saidur Rahaman, founder of Unicorn Studio — custom AI automation for AI SaaS founders and B2B SMBs.

You draft ONE comment to leave on a prospect's social post. Style: ACA (Acknowledge → Compliment → Ask).
- 2-4 sentences max
- Reference one specific thing from the post (use a phrase from it if helpful)
- End with an open-ended question that invites a reply
- Never pitch Unicorn Studio
- No emojis unless the post has them
- No "Great post!" or generic openers — lead with substance`;

export type CommentDraftResult = {
  comment: string;
  contactId: string | null;
  contactName: string | null;
};

export async function draftComment(opts: {
  postText?: string;
  postUrl?: string;
  contactId?: string;
  extraContext?: string;   // optional one-liner like "they just raised seed"
}): Promise<CommentDraftResult | null> {
  if (!isOpenRouterConfigured()) return null;
  if (!opts.postText?.trim() && !opts.postUrl?.trim()) {
    throw new Error("Either postText or postUrl is required");
  }

  let contactName: string | null = null;
  let contactBlurb = "";
  if (opts.contactId) {
    const c = (await db.select().from(schema.contacts).where(eq(schema.contacts.id, opts.contactId)).limit(1))[0];
    if (c) {
      contactName = c.name;
      let profession: string[] = [];
      try { profession = c.profession ? JSON.parse(c.profession) : []; } catch {}
      contactBlurb = `
Author: ${c.name}${c.country ? ` (${c.country})` : ""}
Profession: ${profession.join(", ") || "(unknown)"}
Stage in CRM: ${c.status ?? "(unknown)"}`;
    }
  }

  const post = opts.postText?.trim()
    ? `Post text:\n"""\n${opts.postText.trim().slice(0, 2000)}\n"""`
    : `Post URL: ${opts.postUrl}\n(text not provided — infer reasonable context from the URL or admit if you can't)`;

  const prompt = `${contactBlurb}
${post}
${opts.extraContext ? `\nExtra context: ${opts.extraContext}` : ""}

Draft the comment now. Just the comment body — no quotes, no preamble.`;

  const text = await chat(prompt, {
    model: MODELS.fast,
    systemPrompt: SYSTEM,
    temperature: 0.7,
    maxTokens: 200,
  });

  return {
    comment: text.trim().replace(/^["']|["']$/g, ""),
    contactId: opts.contactId ?? null,
    contactName,
  };
}
