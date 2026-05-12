import type { PageObjectResponse } from "@notionhq/client";
import type { ContentItem } from "../db/schema";

const text = (p: any): string | null => {
  if (!p) return null;
  if (p.type === "title") return p.title?.map((t: any) => t.plain_text).join("") || null;
  if (p.type === "rich_text") return p.rich_text?.map((t: any) => t.plain_text).join("") || null;
  if (p.type === "url") return p.url || null;
  return null;
};

const select = (p: any): string | null => p?.select?.name ?? p?.status?.name ?? null;
const multiSelect = (p: any): string[] => p?.multi_select?.map((o: any) => o.name) ?? [];
const date = (p: any): Date | null => {
  const s = p?.date?.start;
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
const people = (p: any): string[] => p?.people?.map((u: any) => u.id) ?? [];

export function notionToContentItem(page: PageObjectResponse): Omit<ContentItem, "id" | "createdAt"> {
  const props = page.properties as any;
  return {
    notionPageId: page.id,
    notionLastSyncedAt: new Date(),
    notionLastEditedAt: new Date(page.last_edited_time),
    title: text(props["Title"]) || "(untitled)",
    topic: text(props["Topic"]),
    engagement: text(props["Engagement"]),
    framework: text(props["Framework"]),
    url: text(props["URL"]),
    type: select(props["Type"]),
    status: select(props["Status "]),
    contentMethod: select(props["Content Method"]),
    readyToPostPlatform: JSON.stringify(multiSelect(props["Ready to Post Platform"])),
    reusePlatform: JSON.stringify(multiSelect(props["Reuse Platform"])),
    repurposePlatform: JSON.stringify(multiSelect(props["Repurpose Platform"])),
    publishDate: date(props["Publish Date"]),
    reuseDate: date(props["Reuse date"]),
    assignUserIds: JSON.stringify(people(props["Assign"])),
    bodyMarkdown: null,
    claudeRunId: null,
    updatedAt: new Date(page.last_edited_time),
    dirty: 0,
  };
}

export function contentToNotionProperties(c: Partial<ContentItem>): Record<string, any> {
  const out: Record<string, any> = {};
  if (c.title !== undefined) out["Title"] = { title: [{ text: { content: c.title || "" } }] };
  if (c.topic !== undefined) out["Topic"] = { rich_text: [{ text: { content: c.topic || "" } }] };
  if (c.framework !== undefined) out["Framework"] = { rich_text: [{ text: { content: c.framework || "" } }] };
  if (c.engagement !== undefined) out["Engagement"] = { rich_text: [{ text: { content: c.engagement || "" } }] };
  if (c.type !== undefined && c.type !== null) out["Type"] = { select: { name: c.type } };
  if (c.status !== undefined && c.status !== null) out["Status "] = { status: { name: c.status } };
  if (c.contentMethod !== undefined && c.contentMethod !== null)
    out["Content Method"] = { select: { name: c.contentMethod } };
  if (c.publishDate !== undefined) {
    out["Publish Date"] = c.publishDate
      ? { date: { start: c.publishDate.toISOString().slice(0, 10) } }
      : { date: null };
  }
  if (c.url !== undefined) out["URL"] = c.url ? { url: c.url } : { url: null };
  return out;
}
