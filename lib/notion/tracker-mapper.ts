import type { PageObjectResponse } from "@notionhq/client";
import type { TrackerEntry } from "../db/schema";

const text = (p: any): string | null => {
  if (!p) return null;
  if (p.type === "title") return p.title?.map((t: any) => t.plain_text).join("") || null;
  return null;
};
const multiSelect = (p: any): string[] => p?.multi_select?.map((o: any) => o.name) ?? [];

export function notionToTrackerEntry(page: PageObjectResponse): Omit<TrackerEntry, "id" | "createdAt"> {
  const props = page.properties as any;
  return {
    notionPageId: page.id,
    notionLastSyncedAt: new Date(),
    notionLastEditedAt: new Date(page.last_edited_time),
    name: text(props["Name"]) || "(untitled entry)",
    tags: JSON.stringify(multiSelect(props["Tags"])),
    notionCreatedAt: new Date(page.created_time),
    bodyMarkdown: null, // populated in a separate pass if/when we want page bodies
    updatedAt: new Date(page.last_edited_time),
    dirty: 0,
  };
}
