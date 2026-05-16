// LLM response cache. Hashes prompt+model into a stable key, stores with TTL.
// Used to avoid hammering OpenRouter's free-tier daily limit for stable prompts
// (e.g., daily summary is the same all day, stuck suggestions are the same per
// contact per day).

import { createHash } from "crypto";
import { db, schema } from "./db/client";
import { eq } from "drizzle-orm";
import { chat, type MODELS } from "./openrouter";

type CachedChatOpts = {
  model?: string;
  ttlSeconds?: number;     // default 24h
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

function keyFor(model: string, prompt: string, systemPrompt?: string): string {
  return createHash("sha1").update(`${model}\n${systemPrompt ?? ""}\n${prompt}`).digest("hex");
}

// Same shape as chat() but with persistent cache. Returns either the cached
// response or a fresh one. Cache rows are upserted by primary key.
export async function cachedChat(prompt: string, opts: CachedChatOpts = {}): Promise<{ text: string; cached: boolean }> {
  const model = opts.model ?? "google/gemini-2.0-flash-exp:free";
  const cacheKey = keyFor(model, prompt, opts.systemPrompt);

  const existing = await db
    .select()
    .from(schema.aiCache)
    .where(eq(schema.aiCache.cacheKey, cacheKey))
    .limit(1);
  if (existing.length > 0 && existing[0].expiresAt > new Date()) {
    return { text: existing[0].response, cached: true };
  }

  const text = await chat(prompt, opts);
  const expiresAt = new Date(Date.now() + (opts.ttlSeconds ?? 24 * 60 * 60) * 1000);

  // Upsert (delete + insert is simplest with SQLite + Drizzle)
  if (existing.length > 0) {
    await db
      .update(schema.aiCache)
      .set({ model, response: text, expiresAt })
      .where(eq(schema.aiCache.cacheKey, cacheKey));
  } else {
    await db.insert(schema.aiCache).values({ cacheKey, model, response: text, expiresAt });
  }

  return { text, cached: false };
}

export async function invalidateCache(cacheKey: string): Promise<void> {
  await db.delete(schema.aiCache).where(eq(schema.aiCache.cacheKey, cacheKey));
}
