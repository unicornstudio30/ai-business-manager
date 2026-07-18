// Push a log line to a CRM contact's "Log Actions" column in Notion. The
// column is a rich_text field the app treats as an append-only audit trail
// (newest first). Best-effort — failures are swallowed so a Notion outage
// doesn't break /api/sales/log.

import { notion, isNotionConfigured } from "./client";

const MAX_ENTRIES = 40;      // keep the column readable in Notion
const MAX_LINE_LEN = 160;    // truncate long notes
const MAX_TOTAL_CHARS = 1900; // Notion rich_text plain-text length is capped ~2000

// Read the current value of "Log Actions" on the page.
async function readCurrentLog(pageId: string): Promise<string> {
  try {
    const n = notion();
    const page: any = await n.pages.retrieve({ page_id: pageId });
    const prop = page.properties?.["Log Actions"];
    if (!prop || prop.type !== "rich_text") return "";
    return (prop.rich_text ?? [])
      .map((r: any) => r.plain_text ?? "")
      .join("");
  } catch {
    return "";
  }
}

export async function appendContactLogEntry(pageId: string | null | undefined, line: string): Promise<void> {
  if (!pageId || !isNotionConfigured() || !line) return;
  try {
    const trimmed = line.replace(/\s+/g, " ").slice(0, MAX_LINE_LEN);
    const current = await readCurrentLog(pageId);
    // Prepend the new line, keep only the most recent MAX_ENTRIES lines.
    const lines = current.split("\n").filter((s) => s.length > 0);
    lines.unshift(trimmed);
    let combined = lines.slice(0, MAX_ENTRIES).join("\n");
    if (combined.length > MAX_TOTAL_CHARS) {
      combined = combined.slice(0, MAX_TOTAL_CHARS - 1) + "…";
    }
    const n = notion();
    await n.pages.update({
      page_id: pageId,
      properties: {
        "Log Actions": { rich_text: [{ type: "text", text: { content: combined } }] },
      } as any,
    });
  } catch (e: any) {
    // Best-effort — log and swallow
    console.error("[appendContactLogEntry] failed:", e?.message ?? e);
  }
}
