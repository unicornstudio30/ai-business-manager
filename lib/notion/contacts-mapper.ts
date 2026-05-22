// Maps Notion CRM page rows ↔ local `contacts` table rows.
// Notion property names match the "Unicorn Studio's Sales CRM" schema exactly.

import type { PageObjectResponse } from "@notionhq/client";
import type { NewContact } from "../db/schema";
import { trackForPlatform } from "../sequences";

type Props = PageObjectResponse["properties"];

const text = (p: any): string | null => {
  if (!p) return null;
  if (p.type === "title") return p.title?.map((t: any) => t.plain_text).join("") || null;
  if (p.type === "rich_text") return p.rich_text?.map((t: any) => t.plain_text).join("") || null;
  if (p.type === "url") return p.url || null;
  if (p.type === "email") return p.email || null;
  if (p.type === "phone_number") return p.phone_number || null;
  return null;
};

const select = (p: any): string | null => p?.select?.name ?? null;
const multiSelect = (p: any): string[] =>
  p?.multi_select?.map((o: any) => o.name) ?? [];

const date = (p: any): Date | null => {
  const s = p?.date?.start;
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const created = (p: any): Date | null => {
  const s = p?.created_time;
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const number = (p: any): number | null => {
  if (p?.type === "number") return p.number;
  if (p?.type === "select" && p?.select?.name) {
    const n = parseInt(p.select.name, 10);
    return isNaN(n) ? null : n;
  }
  return null;
};

export function notionToContact(page: PageObjectResponse): NewContact {
  const props = page.properties as Props;
  const name = text(props["Name"]) || "(untitled)";
  const platform = select(props["Platform"]);
  return {
    notionPageId: page.id,
    notionLastSyncedAt: new Date(),
    notionLastEditedAt: new Date(page.last_edited_time),
    name,
    email: text(props["Email Address"]),
    contactUrl: text(props["Contact"]),
    otherContactUrl: text(props["Other contacts"]),
    websiteUrl: text(props["website url "]),
    country: select(props["Country"]),
    platform,
    category: JSON.stringify(multiSelect(props["Category"])),
    position: JSON.stringify(multiSelect(props["Position"])),
    profession: JSON.stringify(multiSelect(props["Proffesion"])),
    status: select(props["Status"]),
    statusDate: date(props["Status Date"]),
    followUpDate: date(props["Follow-up Date"]),
    closedDate: date(props["Closed date"]),
    savedDate: created(props["Saved Date"]) || new Date(page.created_time),
    connectionType: multiSelect(props["Connection type"]).join(", ") || null,
    invitationType: select(props["Invitation type"]),
    engageTouch: number(props["Engage Touch"]),
    crossOutreach: select(props["Cross outreach"]),
    remarks: text(props["Remarks"]),
    closedReason: text(props["Closed Reason"]),
    latestAuditSummary: text(props["Latest Audit"]),
    relation: JSON.stringify(multiSelect(props["Relation"])),
    sequenceTrack: trackForPlatform(platform),
    lastTouchAt: date(props["Status Date"]) || new Date(page.last_edited_time),
    updatedAt: new Date(page.last_edited_time),
    dirty: 0,
  };
}

// For pushing local edits back to Notion. Only sends fields the user
// commonly edits in the web app; leaves the rest untouched.
export function contactToNotionProperties(
  c: Partial<NewContact>
): Record<string, any> {
  const out: Record<string, any> = {};
  if (c.name !== undefined) {
    out["Name"] = { title: [{ text: { content: c.name || "" } }] };
  }
  if (c.email !== undefined) {
    out["Email Address"] = { rich_text: [{ text: { content: c.email || "" } }] };
  }
  if (c.status !== undefined && c.status !== null) {
    out["Status"] = { select: { name: c.status } };
  }
  if (c.statusDate !== undefined) {
    out["Status Date"] = c.statusDate
      ? { date: { start: c.statusDate.toISOString().slice(0, 10) } }
      : { date: null };
  }
  if (c.followUpDate !== undefined) {
    out["Follow-up Date"] = c.followUpDate
      ? { date: { start: c.followUpDate.toISOString().slice(0, 10) } }
      : { date: null };
  }
  if (c.remarks !== undefined) {
    out["Remarks"] = { rich_text: [{ text: { content: c.remarks || "" } }] };
  }
  if (c.engageTouch !== undefined && c.engageTouch !== null) {
    out["Engage Touch"] = { select: { name: String(c.engageTouch) } };
  }
  if (c.contactUrl !== undefined) {
    out["Contact"] = c.contactUrl ? { url: c.contactUrl } : { url: null };
  }
  if (c.websiteUrl !== undefined) {
    out["website url "] = { rich_text: [{ text: { content: c.websiteUrl || "" } }] };
  }
  // Web-app-managed columns (added via /api/setup-notion). Push when set.
  if (c.closedReason !== undefined) {
    out["Closed Reason"] = { rich_text: [{ text: { content: c.closedReason || "" } }] };
  }
  if (c.latestAuditSummary !== undefined) {
    out["Latest Audit"] = { rich_text: [{ text: { content: c.latestAuditSummary || "" } }] };
  }
  if (c.relation !== undefined) {
    let rel: string[] = [];
    try { rel = c.relation ? JSON.parse(c.relation) : []; } catch { rel = []; }
    out["Relation"] = { multi_select: rel.map((name) => ({ name })) };
  }
  return out;
}
