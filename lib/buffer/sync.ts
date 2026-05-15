// Buffer → local sync: pull sent posts, upsert into published_posts table.
// Best-effort matches to content_items (by first-line text similarity) when possible.
// Also: when a sent post matches a content_items.bufferPostIds entry, write back
// the per-platform Status/Publish Date/URL to Notion so the calendar reflects reality.

import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import { getCurrentOrgId, listSentPosts, listChannels, isBufferConfigured, type BufferChannel } from "./client";
import { notion } from "../notion/client";
import { contentToNotionProperties } from "../notion/content-mapper";

type SyncResult = { entity: string; pulled: number; matched: number; reflected: number; error?: string };

type Platform = "linkedin" | "x" | "facebook";

// Build per-platform field updates given the platform key + Buffer post details
function buildPlatformUpdate(
  platform: Platform,
  sentAt: Date,
  externalLink: string | null
): Record<string, any> {
  const updates: Record<string, any> = {};
  if (platform === "linkedin") {
    updates.linkedinStatus = "Published ✨";
    updates.linkedinPublishDate = sentAt;
    if (externalLink) updates.linkedinUrl = externalLink;
  } else if (platform === "x") {
    updates.xStatus = "Published ✨";
    updates.xPublishDate = sentAt;
    if (externalLink) updates.xUrl = externalLink;
  } else if (platform === "facebook") {
    updates.facebookStatus = "Published ✨";
    updates.facebookPublishDate = sentAt;
    if (externalLink) updates.facebookUrl = externalLink;
  }
  return updates;
}

function getCurrentStatus(row: any, platform: Platform): string | null {
  if (platform === "linkedin") return row.linkedinStatus;
  if (platform === "x") return row.xStatus;
  return row.facebookStatus;
}

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
  let reflected = 0;
  let errorMsg: string | undefined;

  try {
    const [orgId, channels] = await Promise.all([getCurrentOrgId(), listChannels()]);
    const channelMap = new Map(channels.map((c: BufferChannel) => [c.id, c]));

    // Pre-load content_items twice:
    // 1. lightweight title index for fuzzy matching new posts → content_items
    // 2. full rows so we can look up bufferPostIds → (rowId, platform) for write-back
    const contentRows = await db.select().from(schema.contentItems);
    const titleIndex = new Map<string, string>();
    const bufferIdIndex = new Map<string, { row: typeof contentRows[number]; platform: Platform }>();
    for (const ci of contentRows) {
      const key = normalize(ci.title) || normalize(ci.topic);
      if (key) titleIndex.set(key, ci.id);
      try {
        const ids = ci.bufferPostIds ? (JSON.parse(ci.bufferPostIds) as Record<string, string>) : {};
        for (const [platform, postId] of Object.entries(ids)) {
          if (postId && (platform === "linkedin" || platform === "x" || platform === "facebook")) {
            bufferIdIndex.set(postId, { row: ci, platform: platform as Platform });
          }
        }
      } catch { /* ignore malformed bufferPostIds */ }
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

      // Write-back: if this Buffer post matches a tracked draft, mark the
      // matching content row as Published ✨ + actual sent date + live URL,
      // then push that update to Notion.
      const tracked = bufferIdIndex.get(post.id);
      if (tracked && row.sentAt) {
        const currentStatus = getCurrentStatus(tracked.row, tracked.platform);
        if (currentStatus !== "Published ✨") {
          const updates = buildPlatformUpdate(tracked.platform, row.sentAt, post.externalLink);
          // Apply locally
          await db
            .update(schema.contentItems)
            .set({ ...updates, updatedAt: new Date(), dirty: 1 })
            .where(eq(schema.contentItems.id, tracked.row.id));
          // Push immediately to Notion
          if (tracked.row.notionPageId) {
            try {
              const props = contentToNotionProperties(updates);
              await notion().pages.update({ page_id: tracked.row.notionPageId, properties: props });
              await db
                .update(schema.contentItems)
                .set({ dirty: 0, notionLastSyncedAt: new Date() })
                .where(eq(schema.contentItems.id, tracked.row.id));
            } catch (err: any) {
              console.error(`Buffer→Notion write-back failed for ${tracked.row.id}:`, err.message);
              // leaves dirty=1 — next content_items push will retry
            }
          }
          reflected++;
        }
      }
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

  return { entity: "buffer", pulled, matched, reflected, error: errorMsg };
}
