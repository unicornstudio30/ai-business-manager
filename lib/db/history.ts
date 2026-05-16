// Global history feed — composes a unified chronological event stream from
// the major tables (activities, meetings, audits, tracker entries, sync log,
// content-publish flips). No new tables; pure SELECT + merge in code.

import { db, schema } from "./client";
import { gte, lte, desc, eq, and, inArray, isNotNull } from "drizzle-orm";

export type HistoryEventType =
  | "activity"
  | "meeting"
  | "audit"
  | "tracker"
  | "sync"
  | "content_published";

export type HistoryEvent = {
  id: string;                       // synthetic: `${type}:${sourceId}`
  timestamp: Date;
  type: HistoryEventType;
  title: string;
  summary?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  link?: string;
  badge: { label: string; tone: "stone" | "violet" | "blue" | "emerald" | "amber" | "rose" };
};

export type HistoryFilters = {
  types?: HistoryEventType[];
  since?: Date;
  until?: Date;
  contactId?: string;
  limit?: number;
};

const BADGES: Record<HistoryEventType, HistoryEvent["badge"]> = {
  activity:           { label: "Activity",   tone: "violet" },
  meeting:            { label: "Meeting",    tone: "blue" },
  audit:              { label: "Audit",      tone: "amber" },
  tracker:            { label: "Tracker",    tone: "stone" },
  sync:               { label: "Sync",       tone: "stone" },
  content_published:  { label: "Published",  tone: "emerald" },
};

export async function getHistory(filters: HistoryFilters = {}): Promise<HistoryEvent[]> {
  const types = filters.types ?? (["activity", "meeting", "audit", "tracker", "sync", "content_published"] as HistoryEventType[]);
  const since = filters.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const until = filters.until ?? new Date();
  const limit = filters.limit ?? 200;

  const events: HistoryEvent[] = [];

  // Preload contact name map (cheap; lets us label every event with a name)
  const contactRows = await db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts);
  const contactName = new Map(contactRows.map((c) => [c.id, c.name]));

  // 1) Activities — the main per-contact feed
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
      events.push({
        id: `activity:${a.id}`,
        timestamp: a.createdAt,
        type: "activity",
        title: a.type,
        summary: (a.content ?? "").slice(0, 200).replace(/\n+/g, " ") || null,
        contactId: a.contactId,
        contactName: a.contactId ? contactName.get(a.contactId) ?? null : null,
        link: a.contactId ? `/contacts/${a.contactId}` : undefined,
        badge: BADGES.activity,
      });
    }
  }

  // 2) Meetings
  if (types.includes("meeting") && !filters.contactId) {
    const rows = await db
      .select()
      .from(schema.meetings)
      .where(and(gte(schema.meetings.scheduledAt, since), lte(schema.meetings.scheduledAt, until)))
      .orderBy(desc(schema.meetings.scheduledAt))
      .limit(limit);
    for (const m of rows) {
      if (!m.scheduledAt) continue;
      events.push({
        id: `meeting:${m.id}`,
        timestamp: m.scheduledAt,
        type: "meeting",
        title: m.eventName || "(meeting)",
        summary: m.inviteeName ? `with ${m.inviteeName}` : null,
        contactId: m.contactId,
        contactName: m.contactId ? contactName.get(m.contactId) ?? null : (m.inviteeName ?? null),
        link: `/meetings/${m.id}/brief`,
        badge: BADGES.meeting,
      });
    }
  } else if (types.includes("meeting") && filters.contactId) {
    const rows = await db
      .select()
      .from(schema.meetings)
      .where(and(
        gte(schema.meetings.scheduledAt, since),
        lte(schema.meetings.scheduledAt, until),
        eq(schema.meetings.contactId, filters.contactId)
      ))
      .orderBy(desc(schema.meetings.scheduledAt))
      .limit(limit);
    for (const m of rows) {
      if (!m.scheduledAt) continue;
      events.push({
        id: `meeting:${m.id}`,
        timestamp: m.scheduledAt,
        type: "meeting",
        title: m.eventName || "(meeting)",
        summary: m.inviteeName ? `with ${m.inviteeName}` : null,
        contactId: m.contactId,
        contactName: m.contactId ? contactName.get(m.contactId) ?? null : null,
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
      events.push({
        id: `audit:${a.id}`,
        timestamp: a.createdAt,
        type: "audit",
        title: `Audited ${a.url}`,
        summary: a.summary ?? null,
        contactId: a.contactId,
        contactName: a.contactId ? contactName.get(a.contactId) ?? null : null,
        link: "/audits",
        badge: BADGES.audit,
      });
    }
  }

  // 4) Tracker entries (Notion daily/weekly journal)
  if (types.includes("tracker") && !filters.contactId) {
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
        title: t.name || "(tracker entry)",
        summary: (t.bodyMarkdown ?? "").slice(0, 200).replace(/\n+/g, " ") || null,
        link: "/tracker",
        badge: BADGES.tracker,
      });
    }
  }

  // 5) Sync events (data flowing between systems)
  if (types.includes("sync") && !filters.contactId) {
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
      // Skip noisy zero-row syncs
      if (!s.error && (s.rowsChanged ?? 0) === 0) continue;
      events.push({
        id: `sync:${s.id}`,
        timestamp: s.finishedAt,
        type: "sync",
        title: `${s.entity} ${s.direction}`,
        summary: s.error ? `❌ ${s.error}` : `${s.rowsChanged} row${s.rowsChanged === 1 ? "" : "s"} changed`,
        link: "/settings",
        badge: BADGES.sync,
      });
    }
  }

  // 6) Content publishing — content_items whose per-platform Status flipped to Published
  if (types.includes("content_published") && !filters.contactId) {
    // We don't have a history of status flips; use the publish dates as a proxy.
    // "Published" = any platform has a publish date in range AND that platform's status === "Published ✨"
    const rows = await db.select().from(schema.contentItems);
    for (const c of rows) {
      // Check each platform
      const platforms: Array<{ name: string; status: string | null; date: Date | null }> = [
        { name: "LinkedIn", status: c.linkedinStatus, date: c.linkedinPublishDate },
        { name: "X", status: c.xStatus, date: c.xPublishDate },
        { name: "Facebook", status: c.facebookStatus, date: c.facebookPublishDate },
      ];
      for (const p of platforms) {
        if (p.status !== "Published ✨") continue;
        if (!p.date) continue;
        if (p.date < since || p.date > until) continue;
        events.push({
          id: `content_published:${c.id}:${p.name}`,
          timestamp: p.date,
          type: "content_published",
          title: `Published on ${p.name}`,
          summary: c.title,
          link: c.notionPageId ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}` : "/content",
          badge: BADGES.content_published,
        });
      }
    }
  }

  // Merge + sort
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events.slice(0, limit);
}
