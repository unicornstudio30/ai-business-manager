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
    type: select(props["Type"]),
    topics: select(props["Topics"]),
    repurposePlatform: JSON.stringify(multiSelect(props["Repurpose Platform"])),
    reusePlatform: JSON.stringify(multiSelect(props["Reuse Platform "])),  // note: Notion column has trailing space
    linkedinStatus: select(props["LinkedIn Status"]),
    xStatus: select(props["X Status"]),
    facebookStatus: select(props["Facebook Status"]),
    linkedinPublishDate: date(props["LinkedIn Publish Date"]),
    xPublishDate: date(props["X Publish Date"]),
    facebookPublishDate: date(props["Facebook Publish Date"]),
    linkedinReuseDate: date(props["LinkedIn Reuse Date"]),
    xReuseDate: date(props["X Reuse Date"]),
    facebookReuseDate: date(props["Facebook Reuse Date"]),
    linkedinUrl: text(props["Linkedin URL"]),
    xUrl: text(props["X URL"]),
    facebookUrl: text(props["Facebook URL"]),
    linkedinMetrics: text(props["Linkedin Metrics"]),
    xMetrics: text(props["X Metrics"]),
    facebookMetrics: text(props["Facebook Metrics"]),
    linkedinEngagedPeople: files(props["Linkedin Engaged People List"]).join(",") || null,
    xEngagedPeople: files(props["X Engaged People List"]).join(",") || null,
    facebookEngagedPeople: files(props["Facebook Engaged People List"]).join(",") || null,
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
  if (c.linkedinMetrics !== undefined)
    out["Linkedin Metrics"] = { rich_text: [{ text: { content: c.linkedinMetrics || "" } }] };
  if (c.xMetrics !== undefined)
    out["X Metrics"] = { rich_text: [{ text: { content: c.xMetrics || "" } }] };
  if (c.facebookMetrics !== undefined)
    out["Facebook Metrics"] = { rich_text: [{ text: { content: c.facebookMetrics || "" } }] };
  if (c.linkedinUrl !== undefined)
    out["Linkedin URL"] = c.linkedinUrl ? { url: c.linkedinUrl } : { url: null };
  if (c.xUrl !== undefined)
    out["X URL"] = c.xUrl ? { url: c.xUrl } : { url: null };
  if (c.facebookUrl !== undefined)
    out["Facebook URL"] = c.facebookUrl ? { url: c.facebookUrl } : { url: null };
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
  if (c.linkedinPublishDate !== undefined)
    out["LinkedIn Publish Date"] = c.linkedinPublishDate
      ? { date: { start: c.linkedinPublishDate.toISOString().slice(0, 10) } }
      : { date: null };
  if (c.xPublishDate !== undefined)
    out["X Publish Date"] = c.xPublishDate
      ? { date: { start: c.xPublishDate.toISOString().slice(0, 10) } }
      : { date: null };
  if (c.facebookPublishDate !== undefined)
    out["Facebook Publish Date"] = c.facebookPublishDate
      ? { date: { start: c.facebookPublishDate.toISOString().slice(0, 10) } }
      : { date: null };
  return out;
}
