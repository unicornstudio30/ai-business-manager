// Buffer → local sync: pull sent posts, upsert into published_posts table.
// Best-effort matches to content_items (by first-line text similarity) when possible.

import { db, schema } from "../db/client";
import { eq, sql } from "drizzle-orm";
import { getCurrentOrgId, listSentPosts, listChannels, isBufferConfigured, type BufferChannel } from "./client";

type SyncResult = { entity: string; pulled: number; matched: number; error?: string };

// Normalize text for fuzzy matching (lowercase, trim, collapse whitespace, first 60 chars)
function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function syncBuffer(opts: { maxPages?: number } = {}): Promise<SyncResult> {
  if (!isBufferConfigured()) {
    return { entity: "buffer", pulled: 0, matched: 0, error: "BUFFER_TOKEN not set" };
  }
  const start = new Date();
  let pulled = 0;
  let matched = 0;
  let errorMsg: string | undefined;

  try {
    const [orgId, channels] = await Promise.all([getCurrentOrgId(), listChannels()]);
    const channelMap = new Map(channels.map((c: BufferChannel) => [c.id, c]));

    // Pre-load content_items for fuzzy matching by title/topic prefix
    const contentItems = await db
      .select({ id: schema.contentItems.id, title: schema.contentItems.title, topic: schema.contentItems.topic })
      .from(schema.contentItems);
    const titleIndex = new Map<string, string>();
    for (const ci of contentItems) {
      const key = normalize(ci.title) || normalize(ci.topic);
      if (key) titleIndex.set(key, ci.id);
    }

    for await (const post of listSentPosts(orgId, { maxPages: opts.maxPages ?? 5 })) {
      const ch = channelMap.get(post.channelId);
      const normText = normalize(post.text);
      const matchKey = [...titleIndex.keys()].find((k) => normText.startsWith(k) || k.startsWith(normText));
      const contentItemId = matchKey ? titleIndex.get(matchKey) ?? null : null;
      if (contentItemId) matched++;

      const row = {
        source: "buffer" as const,
        externalId: post.id,
        channel: post.channelService,
        channelName: ch?.name ?? null,
        sentAt: post.sentAt ? new Date(post.sentAt) : null,
        text: post.text,
        externalLink: post.externalLink,
        status: post.status,
        contentItemId,
        updatedAt: new Date(),
      };

      // Upsert by externalId
      const existing = await db
        .select({ id: schema.publishedPosts.id })
        .from(schema.publishedPosts)
        .where(eq(schema.publishedPosts.externalId, post.id))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(schema.publishedPosts).values(row);
      } else {
        await db.update(schema.publishedPosts).set(row).where(eq(schema.publishedPosts.id, existing[0].id));
      }
      pulled++;
    }
  } catch (err: any) {
    errorMsg = err?.message || String(err);
  }

  await db.insert(schema.syncLog).values({
    entity: "published_posts" as any,
    direction: "pull",
    startedAt: start,
    finishedAt: new Date(),
    rowsChanged: pulled,
    error: errorMsg ?? null,
  });

  return { entity: "buffer", pulled, matched, error: errorMsg };
}
