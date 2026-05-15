// Notion → Buffer: when a content_item has Publish Date set + a per-platform Status of "Scheduled",
// create a draft post in Buffer's queue. Tracks created post ids in content_items.bufferPostIds
// so we don't push duplicates.

import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import { isBufferConfigured, listChannels, createDraftPost } from "./client";

type Platform = "linkedin" | "x" | "facebook";

// Map our per-platform field key → Buffer's channelService string
const PLATFORM_TO_SERVICE: Record<Platform, string> = {
  linkedin: "linkedin",
  x: "twitter",
  facebook: "facebook",
};

const PLATFORMS: Platform[] = ["linkedin", "x", "facebook"];

function getStatus(item: any, p: Platform): string | null {
  if (p === "linkedin") return item.linkedinStatus;
  if (p === "x") return item.xStatus;
  return item.facebookStatus;
}

function getPublishDate(item: any, p: Platform): Date | null {
  if (p === "linkedin") return item.linkedinPublishDate;
  if (p === "x") return item.xPublishDate;
  return item.facebookPublishDate;
}

export type PushResult = {
  pushed: number;
  skipped: number;
  errors: { item: string; platform: Platform; error: string }[];
};

export async function pushDraftsForContent(): Promise<PushResult> {
  const result: PushResult = { pushed: 0, skipped: 0, errors: [] };
  if (!isBufferConfigured()) return result;

  const channels = await listChannels();
  const channelByService = new Map<string, string>();
  for (const c of channels) channelByService.set(c.service, c.id);

  // Eligible: any row in the table — we'll check per-platform publish dates inside
  const items = await db.select().from(schema.contentItems);

  for (const item of items) {
    let bufferPostIds: Record<string, string> = {};
    try {
      bufferPostIds = item.bufferPostIds ? JSON.parse(item.bufferPostIds) : {};
    } catch {
      bufferPostIds = {};
    }

    let changed = false;

    for (const platform of PLATFORMS) {
      const status = getStatus(item, platform);
      if (status !== "Scheduled") continue;
      const dueAt = getPublishDate(item, platform);  // optional — if missing, Buffer uses its queue slots
      if (bufferPostIds[platform]) {
        result.skipped++;
        continue;
      }

      const channelId = channelByService.get(PLATFORM_TO_SERVICE[platform]);
      if (!channelId) {
        result.errors.push({ item: item.title, platform, error: "no Buffer channel for this service" });
        continue;
      }

      try {
        const postId = await createDraftPost({
          channelId,
          text: item.title,
          dueAt,
        });
        bufferPostIds[platform] = postId;
        result.pushed++;
        changed = true;
      } catch (err: any) {
        result.errors.push({ item: item.title, platform, error: err?.message || String(err) });
      }
    }

    if (changed) {
      await db
        .update(schema.contentItems)
        .set({ bufferPostIds: JSON.stringify(bufferPostIds), updatedAt: new Date() })
        .where(eq(schema.contentItems.id, item.id));
    }
  }

  return result;
}
