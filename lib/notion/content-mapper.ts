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
const files = (p: any): string[] => {
  if (!p?.files) return [];
  return p.files
    .map((f: any) => f?.file?.url ?? f?.external?.url ?? null)
    .filter((u: string | null): u is string => !!u);
};

export function notionToContentItem(page: PageObjectResponse): Omit<ContentItem, "id" | "createdAt"> {
  const props = page.properties as any;
  return {
    notionPageId: page.id,
    notionLastSyncedAt: new Date(),
    notionLastEditedAt: new Date(page.last_edited_time),
    title: text(props["Title"]) || "(untitled)",
    topic: text(props["Topic"]),
    engagement: null,                              // Notion column removed; legacy field kept null
    engagedPeopleList: null,
    framework: text(props["Framework"]),
    url: text(props["URL"]),
    type: select(props["Type"]),
    status: null,                                  // Notion overall Status column removed
    linkedinStatus: select(props["LinkedIn Status"]),
    xStatus: select(props["X Status"]),
    facebookStatus: select(props["Facebook Status"]),
    instagramStatus: select(props["Instagram Status"]),
    linkedinMetrics: text(props["Linkedin Metrics"]),
    xMetrics: text(props["X Metrics"]),
    facebookMetrics: text(props["Facebook Metrics"]),
    instagramMetrics: text(props["Instagram Metrics"]),
    linkedinEngagedPeople: files(props["Linkedin Engaged People List"]).join(",") || null,
    xEngagedPeople: files(props["X Engaged People List"]).join(",") || null,
    facebookEngagedPeople: files(props["Facebook Engaged People List"]).join(",") || null,
    instagramEngagedPeople: files(props["Instagram Engaged People List"]).join(",") || null,
    contentMethod: select(props["Content Method"]),
    readyToPostPlatform: JSON.stringify(multiSelect(props["Ready to Post Platform"])),
    publishedPlatform: null,                       // Notion column removed
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
  if (c.type !== undefined && c.type !== null) out["Type"] = { select: { name: c.type } };
  if (c.linkedinStatus !== undefined)
    out["LinkedIn Status"] = c.linkedinStatus ? { select: { name: c.linkedinStatus } } : { select: null };
  if (c.xStatus !== undefined)
    out["X Status"] = c.xStatus ? { select: { name: c.xStatus } } : { select: null };
  if (c.facebookStatus !== undefined)
    out["Facebook Status"] = c.facebookStatus ? { select: { name: c.facebookStatus } } : { select: null };
  if (c.instagramStatus !== undefined)
    out["Instagram Status"] = c.instagramStatus ? { select: { name: c.instagramStatus } } : { select: null };
  if (c.linkedinMetrics !== undefined)
    out["Linkedin Metrics"] = { rich_text: [{ text: { content: c.linkedinMetrics || "" } }] };
  if (c.xMetrics !== undefined)
    out["X Metrics"] = { rich_text: [{ text: { content: c.xMetrics || "" } }] };
  if (c.facebookMetrics !== undefined)
    out["Facebook Metrics"] = { rich_text: [{ text: { content: c.facebookMetrics || "" } }] };
  if (c.instagramMetrics !== undefined)
    out["Instagram Metrics"] = { rich_text: [{ text: { content: c.instagramMetrics || "" } }] };
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
