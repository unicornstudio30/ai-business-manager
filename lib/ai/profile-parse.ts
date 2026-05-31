// Extract structured contact data from a social-media profile.
//
// Three input modes, all converge on the same shape:
//   - Image (screenshot of a LinkedIn / X / IG / FB profile page)
//   - Pasted text (copied from the profile page)
//   - URL (server-side fetch — works for blog posts and pages without bot
//     detection; LinkedIn/X/IG/FB usually block)
//
// Output: a partial profile we can merge into the wizard / contact record.

import { chat, chatVision, MODELS, isOpenRouterConfigured } from "../openrouter";

export type ParsedProfile = {
  name?: string;
  role?: string;            // function / department (e.g. "Engineering")
  position?: string;        // title (e.g. "Senior Frontend Engineer")
  company?: string;
  location?: string;
  bio?: string;             // short headline / about
  // Highest-leverage signal — most recent post / activity
  recentPost?: string;
  // Extras we may surface
  skills?: string[];
  interests?: string[];
  recentActivity?: string;  // free-text summary if no single post stands out
  raw?: string;             // raw LLM output for debugging
};

const SYSTEM_PROMPT = `You extract structured contact information from social media profiles.
Return ONLY a JSON object with these keys (omit anything you can't determine):
{
  "name": "Full Name",
  "role": "function or department",
  "position": "specific job title",
  "company": "current company",
  "location": "city, country",
  "bio": "their tagline or 1-2 sentence about",
  "recentPost": "the single most recent post you can see, transcribed verbatim (or as close as possible). Keep it under 1500 chars.",
  "skills": ["skill1", "skill2"],
  "interests": ["topic1", "topic2"],
  "recentActivity": "fallback summary of recent activity if no specific post is visible"
}
Rules:
- Quote the recent post EXACTLY as written. Don't paraphrase. If you only see a snippet, transcribe what you see.
- If a field isn't visible, omit it. Do not guess.
- Return ONLY the JSON object. No commentary, no markdown fences.`;

function tryParseJson(raw: string): ParsedProfile {
  let text = raw.trim();
  // Strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // Sometimes the model wraps JSON in surrounding prose — extract first {...} block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  try {
    const obj = JSON.parse(text);
    return {
      name: typeof obj.name === "string" ? obj.name : undefined,
      role: typeof obj.role === "string" ? obj.role : undefined,
      position: typeof obj.position === "string" ? obj.position : undefined,
      company: typeof obj.company === "string" ? obj.company : undefined,
      location: typeof obj.location === "string" ? obj.location : undefined,
      bio: typeof obj.bio === "string" ? obj.bio : undefined,
      recentPost: typeof obj.recentPost === "string" ? obj.recentPost : undefined,
      skills: Array.isArray(obj.skills) ? obj.skills.filter((s: any) => typeof s === "string") : undefined,
      interests: Array.isArray(obj.interests) ? obj.interests.filter((s: any) => typeof s === "string") : undefined,
      recentActivity: typeof obj.recentActivity === "string" ? obj.recentActivity : undefined,
      raw,
    };
  } catch {
    return { raw };
  }
}

export async function parseProfileFromImage(imageDataUrl: string): Promise<ParsedProfile> {
  if (!isOpenRouterConfigured()) throw new Error("OPENROUTER_API_KEY not set");
  const raw = await chatVision(
    "Extract this person's profile information from the screenshot using the rules above.",
    [imageDataUrl],
    {
      systemPrompt: SYSTEM_PROMPT,
      json: true,
      model: MODELS.vision,
      temperature: 0.2,
      maxTokens: 1500,
    }
  );
  return tryParseJson(raw);
}

export async function parseProfileFromText(text: string): Promise<ParsedProfile> {
  if (!isOpenRouterConfigured()) throw new Error("OPENROUTER_API_KEY not set");
  const raw = await chat(
    `Extract profile information from the following text using the rules in the system prompt:\n\n${text.slice(0, 8000)}`,
    {
      systemPrompt: SYSTEM_PROMPT,
      json: true,
      model: MODELS.prose,
      temperature: 0.2,
      maxTokens: 1500,
    }
  );
  return tryParseJson(raw);
}

// Server-side fetch + parse. Works for personal blogs, GitHub, About pages.
// LinkedIn, X, Instagram, Facebook almost always block with 403/redirect — we
// return a clear error so the user knows to paste the text instead.
export async function parseProfileFromUrl(url: string): Promise<ParsedProfile> {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Known walls — fail fast with an actionable message instead of pretending to try.
  const blockedHosts = [
    "linkedin.com", "www.linkedin.com",
    "x.com", "twitter.com", "mobile.twitter.com",
    "instagram.com", "www.instagram.com",
    "facebook.com", "www.facebook.com",
  ];
  if (blockedHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new Error(
      `${host} blocks server-side fetching. Use "Upload screenshot" or "Paste profile text" instead — or wire up Apify (see notes).`
    );
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UnicornStudioBot/1.0; +https://unicorn-manager.vercel.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: HTTP ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      throw new Error(`Unsupported content-type: ${ct}`);
    }
    html = await res.text();
  } catch (e: any) {
    throw new Error(e?.message ?? "Network error fetching URL");
  }

  // Strip scripts/styles and tags, collapse whitespace.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const text = stripped.slice(0, 12_000);
  if (text.length < 50) {
    throw new Error("Page contained no readable text");
  }
  return parseProfileFromText(text);
}
