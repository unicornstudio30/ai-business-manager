// Maps Notion PRM pages → local networking_contacts rows.
//
// Unlike the Sales CRM mapper (which assumes a fixed schema), the PRM mapper
// probes a list of common Notion column names for each local field, taking the
// first that resolves. This makes the sync robust to whatever column naming the
// user has in their personal PRM database without requiring an explicit mapping
// step. Unmapped columns just stay null locally.

import type { PageObjectResponse } from "@notionhq/client";
import type { NewNetworkingContact } from "../db/schema";

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

const multiSelect = (p: any): string[] => p?.multi_select?.map((o: any) => o.name) ?? [];

const date = (p: any): Date | null => {
  const s = p?.date?.start;
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// Try a list of candidate column names and return the first non-null match.
function pickText(props: Props, names: string[]): string | null {
  for (const n of names) {
    const v = text(props[n]);
    if (v) return v;
  }
  return null;
}
function pickSelect(props: Props, names: string[]): string | null {
  for (const n of names) {
    const v = select(props[n]);
    if (v) return v;
    // Also accept multi-select where caller expects a single value (use first).
    const m = multiSelect(props[n]);
    if (m.length > 0) return m[0];
  }
  return null;
}
function pickMulti(props: Props, names: string[]): string[] {
  for (const n of names) {
    const m = multiSelect(props[n]);
    if (m.length > 0) return m;
  }
  return [];
}
function pickDate(props: Props, names: string[]): Date | null {
  for (const n of names) {
    const d = date(props[n]);
    if (d) return d;
  }
  return null;
}

// Candidate column names for each PRM field. First match wins.
const CANDIDATES = {
  name: ["Name", "Full Name", "Contact"],
  relationship: ["Relationship", "Relation", "Type"],
  source: ["Source", "How met", "Where met", "Met at", "How we met"],
  profileUrl: ["LinkedIn", "Profile", "URL", "Link", "Profile URL", "LinkedIn URL", "Website"],
  email: ["Email", "Email Address", "E-mail"],
  phone: ["Phone", "Phone Number", "Contact Number", "Mobile"],
  platform: ["Platform", "Channel"],
  location: ["Location", "City", "Country", "Where"],
  profession: ["Profession", "Job", "Industry"],
  company: ["Company", "Organization", "Org", "Workplace"],
  // Role = broad function (e.g. "Engineering"); Position = specific title.
  // If only one is set in Notion, both fields will read from it.
  role: ["Role", "Job Function"],
  position: ["Position", "Title", "Job Title"],
  interests: ["Interests", "Topics", "Focus", "Focus Areas"],
  tags: ["Tags", "Labels"],
  stage: ["Stage", "Pipeline", "Status", "State"],
  lastContactAt: ["Last Contact", "Last Contacted", "Last Touch", "Last Activity"],
  nextFollowUpAt: ["Next Follow-up", "Follow-up", "Follow-up Date", "Next Touch", "Next Action"],
  notes: ["Notes", "Notes / Context", "Background", "About", "Bio", "Description"],
  recentPost: ["Recent Post", "Latest Post", "Recent Activity", "Last Post"],
  recentPostUrl: ["Recent Post URL", "Latest Post URL", "Post Link", "Post URL"],
};

export function notionToNetworkingContact(page: PageObjectResponse): NewNetworkingContact {
  const props = page.properties as Props;
  const name = pickText(props, CANDIDATES.name) || "(untitled)";
  const interestsArr = pickMulti(props, CANDIDATES.interests);
  const tagsArr = pickMulti(props, CANDIDATES.tags);

  return {
    notionPageId: page.id,
    notionLastSyncedAt: new Date(),
    notionLastEditedAt: new Date(page.last_edited_time),
    name,
    relationship: pickSelect(props, CANDIDATES.relationship),
    source: pickText(props, CANDIDATES.source) || pickSelect(props, CANDIDATES.source),
    profileUrl: pickText(props, CANDIDATES.profileUrl),
    email: pickText(props, CANDIDATES.email),
    phone: pickText(props, CANDIDATES.phone),
    platform: pickSelect(props, CANDIDATES.platform),
    location: pickText(props, CANDIDATES.location) || pickSelect(props, CANDIDATES.location),
    profession: pickText(props, CANDIDATES.profession) || pickSelect(props, CANDIDATES.profession),
    company: pickText(props, CANDIDATES.company) || pickSelect(props, CANDIDATES.company),
    role: pickText(props, CANDIDATES.role) || pickSelect(props, CANDIDATES.role),
    position: pickText(props, CANDIDATES.position) || pickSelect(props, CANDIDATES.position),
    interests: interestsArr.length > 0 ? JSON.stringify(interestsArr) : null,
    tags: tagsArr.length > 0 ? JSON.stringify(tagsArr) : null,
    stage: pickSelect(props, CANDIDATES.stage),
    lastContactAt: pickDate(props, CANDIDATES.lastContactAt),
    nextFollowUpAt: pickDate(props, CANDIDATES.nextFollowUpAt),
    notes: pickText(props, CANDIDATES.notes),
    recentPost: pickText(props, CANDIDATES.recentPost),
    recentPostUrl: pickText(props, CANDIDATES.recentPostUrl),
    updatedAt: new Date(page.last_edited_time),
    dirty: 0,
  };
}
