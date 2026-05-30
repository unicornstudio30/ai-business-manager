// Global history feed — composes a unified chronological event stream from
// every major table. No new tables; pure SELECT + merge in code.
//
// Event types are grouped into categories:
//   sales     — work that moves deals: activities, meetings, audits, stage flips, daily KPIs, journal
//   marketing — work that builds reach: content created, content published
//   system    — plumbing: notion/gcal sync events

import { db, schema } from "./client";
import { gte, lte, desc, eq, and, isNotNull } from "drizzle-orm";
import { platformToChannel, type InboxChannel } from "../inbox";

export type HistoryEventType =
  // sales
  | "activity"
  | "meeting"
  | "audit"
  | "deal_closed"
  | "tracker"
  | "kpi_logged"
  // marketing
  | "content_created"
  | "content_published"
  // system
  | "sync";

export type HistoryCategory = "sales" | "marketing" | "system";

export const TYPES_BY_CATEGORY: Record<HistoryCategory, HistoryEventType[]> = {
  sales: ["activity", "meeting", "audit", "deal_closed", "tracker", "kpi_logged"],
  marketing: ["content_created", "content_published"],
  system: ["sync"],
};

export const ALL_TYPES: HistoryEventType[] = [
  ...TYPES_BY_CATEGORY.sales,
  ...TYPES_BY_CATEGORY.marketing,
  ...TYPES_BY_CATEGORY.system,
];

export const CATEGORY_OF: Record<HistoryEventType, HistoryCategory> = {
  activity: "sales",
  meeting: "sales",
  audit: "sales",
  deal_closed: "sales",
  tracker: "sales",
  kpi_logged: "sales",
  content_created: "marketing",
  content_published: "marketing",
  sync: "system",
};

export type HistoryEvent = {
  id: string;                       // synthetic: `${type}:${sourceId}`
  timestamp: Date;
  type: HistoryEventType;
  category: HistoryCategory;
  subtype?: string;                 // for activities: dm_sent, comment_drafted, etc.
  title: string;
  summary?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  platform?: InboxChannel | null;   // normalized channel slug (linkedin, x, …) when known
  link?: string;
  badge: { label: string; tone: "stone" | "violet" | "blue" | "emerald" | "amber" | "rose" | "indigo" };
};

export type HistoryFilters = {
  types?: HistoryEventType[];        // if empty array passed, returns 0 events; if undefined, defaults to ALL_TYPES
  activitySubtypes?: string[];       // restrict activity events to these subtypes (e.g., ["dm_sent","comment_drafted"])
  platform?: InboxChannel;           // restrict to events on this channel (uses event.platform)
  since?: Date;
  until?: Date;
  contactId?: string;
  contactSearch?: string;            // case-insensitive substring on contact name
  limit?: number;
};

// Human-readable labels for activity subtypes
export const ACTIVITY_SUBTYPES = [
  "dm_sent",
  "comment_drafted",
  "email_drafted",
  "follow_up_sent",
  "audit_run",
  "post_observed",
  "note",
] as const;

export const ACTIVITY_SUBTYPE_LABEL: Record<string, string> = {
  dm_sent: "DM sent",
  comment_drafted: "Comment drafted",
  email_drafted: "Email drafted",
  follow_up_sent: "Follow-up sent",
  audit_run: "Audit run",
  post_observed: "Post observed",
  note: "Note",
};

// Outbound = work Saidur did (the "input")
export const OUTBOUND_SUBTYPES = ["dm_sent", "comment_drafted", "email_drafted", "follow_up_sent", "audit_run", "post_observed"] as const;

const BADGES: Record<HistoryEventType, HistoryEvent["badge"]> = {
  activity:           { label: "Activity",     tone: "violet" },
  meeting:            { label: "Meeting",      tone: "blue" },
  audit:              { label: "Audit",        tone: "amber" },
  deal_closed:        { label: "Deal closed",  tone: "rose" },
  tracker:            { label: "Tracker",      tone: "stone" },
  kpi_logged:         { label: "Daily KPI",    tone: "indigo" },
  content_created:    { label: "Content idea", tone: "stone" },
  content_published:  { label: "Published",    tone: "emerald" },
  sync:               { label: "Sync",         tone: "stone" },
};

export async function getHistory(filters: HistoryFilters = {}): Promise<HistoryEvent[]> {
  // Note: undefined types → all; empty-array types → zero events (explicit "none selected")
  const types = filters.types === undefined ? ALL_TYPES : filters.types;
  if (types.length === 0) return [];

  const since = filters.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const until = filters.until ?? new Date();
  const limit = filters.limit ?? 200;

  const events: HistoryEvent[] = [];

  // Preload contacts so every event can carry a contact name + platform
  const contactRows = await db
    .select({ id: schema.contacts.id, name: schema.contacts.name, platform: schema.contacts.platform })
    .from(schema.contacts);
  const contactName = new Map(contactRows.map((c) => [c.id, c.name]));
  const contactPlatform = new Map(contactRows.map((c) => [c.id, platformToChannel(c.platform)]));
  function platformFor(contactId: string | null | undefined): InboxChannel | null {
    if (!contactId) return null;
    return contactPlatform.get(contactId) ?? null;
  }
  const contactMatch = (id: string | null | undefined): boolean => {
    if (filters.contactId && id !== filters.contactId) return false;
    if (filters.contactSearch) {
      if (!id) return false;
      const name = contactName.get(id) ?? "";
      if (!name.toLowerCase().includes(filters.contactSearch.toLowerCase())) return false;
    }
    return true;
  };

  // 1) Activities — main per-contact feed (each carries a subtype: dm_sent, etc.)
  if (types.includes("activity")) {
    const where = and(
      gte(schema.activities.createdAt, since),
      lte(schema.activities.createdAt, until),
      filters.contactId ? eq(schema.activities.contactId, filters.contactId) : undefined
    );
    const rows = await db
      .select()
      .from(schema.activities)
      .where(where)
      .orderBy(desc(schema.activities.createdAt))
      .limit(limit);
    for (const a of rows) {
      if (!a.createdAt) continue;
      if (!contactMatch(a.contactId)) continue;
      if (filters.activitySubtypes && filters.activitySubtypes.length > 0 && !filters.activitySubtypes.includes(a.type)) continue;
      const name = a.contactId ? contactName.get(a.contactId) ?? null : null;
      const label = ACTIVITY_SUBTYPE_LABEL[a.type] ?? a.type;
      events.push({
        id: `activity:${a.id}`,
        timestamp: a.createdAt,
        type: "activity",
        category: "sales",
        subtype: a.type,
        title: name ? `${label} → ${name}` : label,
        summary: (a.content ?? "").slice(0, 200).replace(/\n+/g, " ") || null,
        contactId: a.contactId,
        contactName: name,
        // Activity may carry an explicit channel; fall back to contact's platform.
        platform: (a.channel as InboxChannel | null) ?? platformFor(a.contactId),
        link: a.contactId ? `/contacts/${a.contactId}` : undefined,
        badge: BADGES.activity,
      });
    }
  }

  // 2) Meetings
  if (types.includes("meeting")) {
    const where = and(
      gte(schema.meetings.scheduledAt, since),
      lte(schema.meetings.scheduledAt, until),
      filters.contactId ? eq(schema.meetings.contactId, filters.contactId) : undefined
    );
    const rows = await db
      .select()
      .from(schema.meetings)
      .where(where)
      .orderBy(desc(schema.meetings.scheduledAt))
      .limit(limit);
    for (const m of rows) {
      if (!m.scheduledAt) continue;
      if (!contactMatch(m.contactId)) continue;
      events.push({
        id: `meeting:${m.id}`,
        timestamp: m.scheduledAt,
        type: "meeting",
        category: "sales",
        title: m.eventName || "(meeting)",
        summary: m.inviteeName ? `with ${m.inviteeName}` : null,
        contactId: m.contactId,
        contactName: m.contactId ? contactName.get(m.contactId) ?? null : (m.inviteeName ?? null),
        platform: platformFor(m.contactId),
        link: `/meetings/${m.id}/brief`,
        badge: BADGES.meeting,
      });
    }
  }

  // 3) Audits
  if (types.includes("audit")) {
    const where = and(
      gte(schema.audits.createdAt, since),
      lte(schema.audits.createdAt, until),
      filters.contactId ? eq(schema.audits.contactId, filters.contactId) : undefined
    );
    const rows = await db
      .select()
      .from(schema.audits)
      .where(where)
      .orderBy(desc(schema.audits.createdAt))
      .limit(limit);
    for (const a of rows) {
      if (!a.createdAt) continue;
      if (!contactMatch(a.contactId)) continue;
      events.push({
        id: `audit:${a.id}`,
        timestamp: a.createdAt,
        type: "audit",
        category: "sales",
        title: `Audited ${a.url}`,
        summary: a.summary ?? null,
        contactId: a.contactId,
        contactName: a.contactId ? contactName.get(a.contactId) ?? null : null,
        platform: platformFor(a.contactId),
        link: "/audits",
        badge: BADGES.audit,
      });
    }
  }

  // 4) Deal closed — contacts.closedDate in range (Partnership / Lost / etc.)
  if (types.includes("deal_closed")) {
    const where = and(
      isNotNull(schema.contacts.closedDate),
      gte(schema.contacts.closedDate, since),
      lte(schema.contacts.closedDate, until),
      filters.contactId ? eq(schema.contacts.id, filters.contactId) : undefined
    );
    const rows = await db.select().from(schema.contacts).where(where).limit(limit);
    for (const c of rows) {
      if (!c.closedDate) continue;
      if (filters.contactSearch && !(c.name ?? "").toLowerCase().includes(filters.contactSearch.toLowerCase())) continue;
      const isWin = c.status === "Partnership";
      events.push({
        id: `deal_closed:${c.id}`,
        timestamp: c.closedDate,
        type: "deal_closed",
        category: "sales",
        title: isWin ? `🎉 Won: ${c.name}` : `Closed: ${c.name}`,
        summary: c.status ?? null,
        contactId: c.id,
        contactName: c.name,
        platform: platformToChannel(c.platform),
        link: `/contacts/${c.id}`,
        badge: BADGES.deal_closed,
      });
    }
  }

  // 5) Tracker entries (Notion sales journal)
  if (types.includes("tracker") && !filters.contactId && !filters.contactSearch) {
    const rows = await db
      .select()
      .from(schema.trackerEntries)
      .where(and(gte(schema.trackerEntries.createdAt, since), lte(schema.trackerEntries.createdAt, until)))
      .orderBy(desc(schema.trackerEntries.createdAt))
      .limit(limit);
    for (const t of rows) {
      if (!t.createdAt) continue;
      events.push({
        id: `tracker:${t.id}`,
        timestamp: t.createdAt,
        type: "tracker",
        category: "sales",
        title: t.name || "(tracker entry)",
        summary: (t.bodyMarkdown ?? "").slice(0, 200).replace(/\n+/g, " ") || null,
        link: "/tracker",
        badge: BADGES.tracker,
      });
    }
  }

  // 6) Daily KPIs logged
  if (types.includes("kpi_logged") && !filters.contactId && !filters.contactSearch) {
    const rows = await db
      .select()
      .from(schema.dailySalesKpis)
      .where(and(
        isNotNull(schema.dailySalesKpis.createdAt),
        gte(schema.dailySalesKpis.createdAt, since),
        lte(schema.dailySalesKpis.createdAt, until)
      ))
      .orderBy(desc(schema.dailySalesKpis.createdAt))
      .limit(limit);
    for (const k of rows) {
      if (!k.createdAt) continue;
      const parts: string[] = [];
      if ((k.coldDmsSent ?? 0) > 0) parts.push(`${k.coldDmsSent} cold DMs`);
      if ((k.followUpsSent ?? 0) > 0) parts.push(`${k.followUpsSent} follow-ups`);
      if ((k.callsBooked ?? 0) > 0) parts.push(`${k.callsBooked} calls booked`);
      if ((k.responses ?? 0) > 0) parts.push(`${k.responses} responses`);
      if ((k.inboundLeads ?? 0) > 0) parts.push(`${k.inboundLeads} inbound`);
      events.push({
        id: `kpi_logged:${k.id}`,
        timestamp: k.createdAt,
        type: "kpi_logged",
        category: "sales",
        title: `Daily KPIs: ${k.date ? new Date(k.date).toISOString().slice(0, 10) : "—"}`,
        summary: parts.length > 0 ? parts.join(" · ") : "no activity logged",
        link: "/daily-sales",
        badge: BADGES.kpi_logged,
      });
    }
  }

  // 7) Content created (new content_items in range)
  if (types.includes("content_created") && !filters.contactId && !filters.contactSearch) {
    const rows = await db
      .select()
      .from(schema.contentItems)
      .where(and(
        isNotNull(schema.contentItems.createdAt),
        gte(schema.contentItems.createdAt, since),
        lte(schema.contentItems.createdAt, until)
      ))
      .orderBy(desc(schema.contentItems.createdAt))
      .limit(limit);
    for (const c of rows) {
      if (!c.createdAt) continue;
      events.push({
        id: `content_created:${c.id}`,
        timestamp: c.createdAt,
        type: "content_created",
        category: "marketing",
        title: `Content idea: ${c.title}`,
        summary: [c.type, c.topics].filter(Boolean).join(" · ") || null,
        link: c.notionPageId ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}` : "/content",
        badge: BADGES.content_created,
      });
    }
  }

  // 8) Content publishing — per-platform Publish Date + status === "Published ✨"
  if (types.includes("content_published") && !filters.contactId && !filters.contactSearch) {
    const rows = await db.select().from(schema.contentItems);
    for (const c of rows) {
      const platforms: Array<{ name: string; channel: InboxChannel; status: string | null; date: Date | null }> = [
        { name: "LinkedIn", channel: "linkedin", status: c.linkedinStatus, date: c.linkedinPublishDate },
        { name: "X",        channel: "x",        status: c.xStatus,        date: c.xPublishDate },
        { name: "Facebook", channel: "facebook", status: c.facebookStatus, date: c.facebookPublishDate },
      ];
      for (const p of platforms) {
        if (p.status !== "Published ✨") continue;
        if (!p.date) continue;
        if (p.date < since || p.date > until) continue;
        events.push({
          id: `content_published:${c.id}:${p.name}`,
          timestamp: p.date,
          type: "content_published",
          category: "marketing",
          title: `Published on ${p.name}`,
          summary: c.title,
          platform: p.channel,
          link: c.notionPageId ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}` : "/content",
          badge: BADGES.content_published,
        });
      }
    }
  }

  // 9) Sync events
  if (types.includes("sync") && !filters.contactId && !filters.contactSearch) {
    const rows = await db
      .select()
      .from(schema.syncLog)
      .where(and(
        isNotNull(schema.syncLog.finishedAt),
        gte(schema.syncLog.finishedAt, since),
        lte(schema.syncLog.finishedAt, until)
      ))
      .orderBy(desc(schema.syncLog.finishedAt))
      .limit(limit);
    for (const s of rows) {
      if (!s.finishedAt) continue;
      // Skip noisy zero-row syncs unless they're errors
      if (!s.error && (s.rowsChanged ?? 0) === 0) continue;
      events.push({
        id: `sync:${s.id}`,
        timestamp: s.finishedAt,
        type: "sync",
        category: "system",
        title: `${s.entity} ${s.direction}`,
        summary: s.error ? `❌ ${s.error}` : `${s.rowsChanged} row${s.rowsChanged === 1 ? "" : "s"} changed`,
        link: "/settings",
        badge: BADGES.sync,
      });
    }
  }

  // Platform filter — applied across all event types after collection.
  // Events without a known platform (tracker, kpi_logged, content_created, sync)
  // are dropped when a platform is selected so the user sees only on-platform work.
  const platformFiltered = filters.platform
    ? events.filter((e) => e.platform === filters.platform)
    : events;

  platformFiltered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return platformFiltered.slice(0, limit);
}
