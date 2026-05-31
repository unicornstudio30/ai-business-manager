// Write Message engine — assembles a templated prompt from the wizard inputs
// and asks the LLM to return three lengths (Short / Standard / Detailed) in
// a single structured JSON call.
//
// Frameworks supported (picked in step 5b of the wizard):
//   - ACA      Acknowledge → Compliment → Ask          (warm, personal)
//   - AIDA     Attention → Interest → Desire → Action  (classic sales)
//   - PAS      Problem → Agitate → Solve               (pain-driven)
//   - FAB      Features → Advantages → Benefits        (offer-led)
//   - BAB      Before → After → Bridge                 (transformation arc)
//   - QUEST    Qualify → Understand → Educate → Stimulate → Transition
//   - Casual   No framework — natural conversational

import { chat, MODELS, isOpenRouterConfigured } from "../openrouter";
import type { NetworkingContact } from "../db/schema";

export type WriteMessageInputs = {
  recipient: NetworkingContact;
  relationship?: string | null;        // step 1
  purpose?: string | null;             // step 2
  contextChips?: string[];             // step 3
  contextDetail?: string | null;
  ctaChips?: string[];                 // step 4
  tone?: string | null;                // step 5
  framework?: string | null;           // step 5b — see FRAMEWORKS
  channel?: string | null;             // step 6
  language?: string | null;
  topic?: string | null;               // step 7
  // Recent post / social activity to anchor the message in. Falls back to
  // contact.recentPost if not supplied per-message.
  recentPost?: string | null;
  recentPostUrl?: string | null;
  // Optional: previous message to this contact (for thread continuity)
  lastMessage?: string | null;
  // Sender identity injected into the prompt
  senderName?: string;
  senderOrg?: string;
};

export type WriteMessageOutput = {
  short: string;
  standard: string;
  detailed: string;
};

export const FRAMEWORKS = [
  { id: "ACA", label: "ACA — Acknowledge → Compliment → Ask", help: "Warm, personal openers" },
  { id: "AIDA", label: "AIDA — Attention → Interest → Desire → Action", help: "Classic sales arc" },
  { id: "PAS", label: "PAS — Problem → Agitate → Solve", help: "Pain-led pitch" },
  { id: "FAB", label: "FAB — Features → Advantages → Benefits", help: "Offer-led product framing" },
  { id: "BAB", label: "BAB — Before → After → Bridge", help: "Transformation story" },
  { id: "QUEST", label: "QUEST — Qualify → Understand → Educate → Stimulate → Transition", help: "Discovery / consultative" },
  { id: "Casual", label: "Casual — no framework", help: "Conversational, no structure" },
] as const;

const FRAMEWORK_GUIDE: Record<string, string> = {
  ACA: "Use ACA: 1) Acknowledge something specific about them or their work, 2) Compliment in a non-sycophantic way (tie to a concrete observation), 3) Ask one clear question or make one clean request.",
  AIDA: "Use AIDA: 1) Open with a sharp Attention-grabber tied to the recipient, 2) Build Interest with one relevant fact or insight, 3) Show Desire by linking to a specific outcome they want, 4) Close with a clear Action.",
  PAS: "Use PAS: 1) Name a Problem they likely face, 2) briefly Agitate the cost of not fixing it, 3) propose a specific Solution and the next step.",
  FAB: "Use FAB: 1) Lead with one concrete Feature relevant to them, 2) translate it into an Advantage, 3) close with the Benefit in their terms + ask.",
  BAB: "Use BAB: 1) Describe the Before state they likely recognize, 2) paint the After state once the problem is solved, 3) propose the Bridge (next step / call).",
  QUEST: "Use QUEST: 1) Qualify gently that they're the right person, 2) show you Understand their context, 3) Educate with one short insight, 4) Stimulate interest with a specific possibility, 5) Transition to a clear ask.",
  Casual: "No formal framework — write like a thoughtful note from one person to another. Personal, specific, no pitch energy.",
};

function recipientSummary(c: NetworkingContact): string {
  const parts: string[] = [];
  parts.push(`Name: ${c.name}`);
  if (c.role) parts.push(`Role / function: ${c.role}`);
  if (c.position) parts.push(`Position / title: ${c.position}`);
  if (c.company) parts.push(`Company: ${c.company}`);
  if (c.profession) parts.push(`Profession: ${c.profession}`);
  if (c.location) parts.push(`Location: ${c.location}`);
  if (c.email) parts.push(`Email: ${c.email}`);
  if (c.phone) parts.push(`Phone: ${c.phone}`);
  if (c.profileUrl) parts.push(`Profile URL: ${c.profileUrl}`);
  if (c.relationship) parts.push(`Relationship to me: ${c.relationship}`);
  if (c.source) parts.push(`How we met: ${c.source}`);
  if (c.platform) parts.push(`Primary platform: ${c.platform}`);
  if (c.stage) parts.push(`Networking stage: ${c.stage}`);
  if (c.lastContactAt) parts.push(`Last contacted: ${c.lastContactAt.toISOString().slice(0, 10)}`);
  if (c.interests) {
    try {
      const arr = JSON.parse(c.interests);
      if (Array.isArray(arr) && arr.length > 0) parts.push(`Interests: ${arr.join(", ")}`);
    } catch {}
  }
  if (c.tags) {
    try {
      const arr = JSON.parse(c.tags);
      if (Array.isArray(arr) && arr.length > 0) parts.push(`Tags: ${arr.join(", ")}`);
    } catch {}
  }
  if (c.notes) parts.push(`Personal notes: ${c.notes.slice(0, 600)}`);
  return parts.join("\n");
}

function buildPrompt(input: WriteMessageInputs): { system: string; user: string } {
  const r = input.recipient;
  const framework = input.framework || "Casual";
  const frameworkGuide = FRAMEWORK_GUIDE[framework] || FRAMEWORK_GUIDE.Casual;
  const language = input.language || "English";

  // Recent post: prefer per-message override, fall back to contact column.
  const recentPost = input.recentPost ?? r.recentPost ?? null;
  const recentPostUrl = input.recentPostUrl ?? r.recentPostUrl ?? null;

  const system = [
    `You are an expert relationship-builder writing a personalized outreach message on behalf of ${input.senderName || "the sender"}${input.senderOrg ? ` (${input.senderOrg})` : ""}.`,
    `Write in ${language}. Use the recipient's name and the specific details from their profile and (if provided) their recent post.`,
    "When a recent post is supplied, reference something concrete from it — a phrase, claim, or angle — so the recipient knows you actually read it. Don't paraphrase the whole thing; quote or refer to one sharp detail.",
    "Tone must be human and specific — never generic, never salesy, never templated.",
    "Output a single JSON object with three keys: \"short\", \"standard\", \"detailed\". Each is a message body string (no subject line, no signature).",
    "  - short:     1-2 sentences, ~25-45 words. For a quick DM ping.",
    "  - standard:  3-5 sentences, ~60-100 words. Default length.",
    "  - detailed:  6-10 sentences, ~120-200 words. For email or a deeper first touch.",
    "All three variants share the SAME intent and the SAME ask — they differ only in length and amount of supporting context.",
  ].join("\n");

  const user = [
    `## Recipient profile`,
    recipientSummary(r),
    "",
    recentPost
      ? `## Their recent post / activity\n${recentPost.slice(0, 1500)}${recentPostUrl ? `\nSource: ${recentPostUrl}` : ""}\n`
      : "",
    input.lastMessage ? `## Most recent message I sent this person\n${input.lastMessage.slice(0, 800)}\n` : "",
    `## My intent`,
    input.purpose ? `- Purpose: ${input.purpose}` : "",
    input.topic ? `- Topic: ${input.topic}` : "",
    input.contextChips && input.contextChips.length > 0
      ? `- Context tags: ${input.contextChips.join(", ")}`
      : "",
    input.contextDetail ? `- Context detail: ${input.contextDetail}` : "",
    input.ctaChips && input.ctaChips.length > 0
      ? `- Call to action: ${input.ctaChips.join(", ")}`
      : "",
    input.tone ? `- Tone: ${input.tone}` : "",
    input.channel ? `- Channel: ${input.channel}` : "",
    "",
    `## Framework`,
    frameworkGuide,
    "",
    "## Output",
    "Return ONLY a JSON object with keys: short, standard, detailed. No commentary, no markdown fences.",
  ].filter(Boolean).join("\n");

  return { system, user };
}

export async function generateMessageVariants(
  input: WriteMessageInputs
): Promise<WriteMessageOutput> {
  if (!isOpenRouterConfigured()) {
    throw new Error("OPENROUTER_API_KEY not set in .env.local");
  }
  const { system, user } = buildPrompt(input);
  const raw = await chat(user, {
    systemPrompt: system,
    json: true,
    model: MODELS.prose,
    temperature: 0.8,
    maxTokens: 1200,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to recover from a fenced response
    const stripped = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      throw new Error("LLM returned non-JSON output");
    }
  }

  const short = String(parsed?.short ?? "").trim();
  const standard = String(parsed?.standard ?? "").trim();
  const detailed = String(parsed?.detailed ?? "").trim();
  if (!short || !standard || !detailed) {
    throw new Error("LLM response missing one or more variants");
  }
  return { short, standard, detailed };
}

// Strength score: weighted count of completed wizard steps. Purely a UX nudge —
// does not affect generation. Range 0–100.
export function computeStrengthScore(input: Partial<WriteMessageInputs>): number {
  let score = 0;
  // Recipient grounding
  if (input.recipient?.name) score += 8;
  if (input.relationship) score += 7;
  // Recent post is the highest-leverage signal — anchors the message in something concrete
  const post = input.recentPost ?? input.recipient?.recentPost;
  if (post && post.length > 30) score += 15;
  // Intent
  if (input.purpose) score += 12;
  // Context
  const cc = input.contextChips?.length ?? 0;
  if (cc > 0) score += 4;
  if (cc >= 2) score += 3;
  if (cc >= 3) score += 3;
  if (input.contextDetail && input.contextDetail.length > 30) score += 8;
  // CTA
  const ca = input.ctaChips?.length ?? 0;
  if (ca > 0) score += 10;
  // Tone + framework
  if (input.tone) score += 8;
  if (input.framework) score += 5;
  // Channel + language + topic
  if (input.channel) score += 3;
  if (input.language) score += 4;
  if (input.topic && input.topic.length > 3) score += 10;
  return Math.max(0, Math.min(100, score));
}
