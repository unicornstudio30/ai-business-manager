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
    topic: null,                                   // Notion column removed
    engagement: null,
    engagedPeopleList: null,
    framework: null,                               // Notion column removed
    url: text(props["URL"]),
    type: select(props["Type"]),
    topics: select(props["Topics"]),
    status: null,
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
    contentMethod: null,                           // Notion column removed
    readyToPostPlatform: null,                     // Notion column removed
    publishedPlatform: null,
    reusePlatform: null,                           // Notion column removed (replaced by per-platform Reuse Date)
    repurposePlatform: JSON.stringify(multiSelect(props["Repurpose Platform"])),
    publishDate: date(props["Publish Date"]),
    reuseDate: null,                               // Notion column removed
    linkedinReuseDate: date(props["LinkedIn Reuse Date"]),
    xReuseDate: date(props["X Reuse Date"]),
    facebookReuseDate: date(props["Facebook Reuse Date"]),
    instagramReuseDate: date(props["Instagram Reuse Date"]),
    assignUserIds: null,                           // Notion column removed
    bodyMarkdown: null,
    claudeRunId: null,
    updatedAt: new Date(page.last_edited_time),
    dirty: 0,
  };
}

export function contentToNotionProperties(c: Partial<ContentItem>): Record<string, any> {
  const out: Record<string, any> = {};
  if (c.title !== undefined) out["Title"] = { title: [{ text: { content: c.title || "" } }] };
  if (c.type !== undefined && c.type !== null) out["Type"] = { select: { name: c.type } };
  if (c.topics !== undefined)
    out["Topics"] = c.topics ? { select: { name: c.topics } } : { select: null };
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
  if (c.linkedinReuseDate !== undefined)
    out["LinkedIn Reuse Date"] = c.linkedinReuseDate
      ? { date: { start: c.linkedinReuseDate.toISOString().slice(0, 10) } }
      : { date: null };
  if (c.xReuseDate !== undefined)
    out["X Reuse Date"] = c.xReuseDate
      ? { date: { start: c.xReuseDate.toISOString().slice(0, 10) } }
      : { date: null };
  if (c.facebookReuseDate !== undefined)
    out["Facebook Reuse Date"] = c.facebookReuseDate
      ? { date: { start: c.facebookReuseDate.toISOString().slice(0, 10) } }
      : { date: null };
  if (c.instagramReuseDate !== undefined)
    out["Instagram Reuse Date"] = c.instagramReuseDate
      ? { date: { start: c.instagramReuseDate.toISOString().slice(0, 10) } }
      : { date: null };
  if (c.publishDate !== undefined) {
    out["Publish Date"] = c.publishDate
      ? { date: { start: c.publishDate.toISOString().slice(0, 10) } }
      : { date: null };
  }
  if (c.url !== undefined) out["URL"] = c.url ? { url: c.url } : { url: null };
  return out;
}
