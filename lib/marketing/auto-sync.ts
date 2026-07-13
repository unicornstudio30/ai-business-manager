// Auto-feed all three leaderboards from existing app data.
//
// Marketing sources → marketing_activities:
//   1. content_items publish/reuse dates per platform → "post"
//   2. networking_messages with status=sent → "dm"       (marketing-style outreach)
//   3. CRM `comment_drafted` activities → "comment"       (engaging on prospects' content)
//
// Sales sources → sales_activities:
//   1. CRM `dm_sent` → "dm_sent"
//   2. CRM `follow_up_sent` → "follow_up"
//   3. CRM `email_drafted` → "dm_sent" (outbound touch, treated as DM equivalent)
//
// (Build feed is manual-only for now — no automatic sources.)
//
// Every auto-row stamps a `source` key so re-runs are idempotent (unique index).
// Manual rows have source=null and are untouched.

import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import { pointsFor, weekStartFor, type ActivityKind, type Platform } from "./points";
import {
  pointsFor as salesPointsFor,
  type ActivityKind as SalesKind,
  type Channel as SalesChannel,
} from "../sales/points";

type PlatformLike = string | null | undefined;

const LOOKBACK_DAYS = 120; // re-credit only recent activity to keep work bounded

function lookbackCutoff(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - LOOKBACK_DAYS);
  return d;
}

// Map a free-text platform value (from contacts.platform or networking.channel)
// to a canonical Platform. Anything unrecognized falls back to "other".
function normalizePlatform(p: PlatformLike): Platform {
  const s = String(p || "").trim().toLowerCase();
  if (!s) return "other";
  if (s.includes("linkedin")) return "linkedin";
  if (s === "x" || s === "twitter" || s.includes("x.com")) return "x";
  if (s.includes("youtube") || s === "yt") return "youtube";
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("reddit")) return "reddit";
  if (s.includes("instagram") || s === "ig") return "instagram";
  if (s.includes("facebook") || s === "fb") return "facebook";
  if (s.includes("blog")) return "blog";
  if (s.includes("podcast")) return "podcast";
  if (s.includes("newsletter")) return "newsletter";
  return "other";
}

// Match a Notion Person name to a user, preferring an explicit notion_person
// override on the user row, falling back to a case-insensitive name match.
type LiteUser = { id: string; name: string; notionPerson: string | null; role: string };

function resolveUserId(ownerName: string | null | undefined, users: LiteUser[]): string | null {
  if (!ownerName) return null;
  const needle = ownerName.trim().toLowerCase();
  if (!needle) return null;
  // Prefer the override
  const byOverride = users.find((u) => (u.notionPerson || "").trim().toLowerCase() === needle);
  if (byOverride) return byOverride.id;
  const byName = users.find((u) => (u.name || "").trim().toLowerCase() === needle);
  if (byName) return byName.id;
  return null;
}

// Owner fallback — first owner-role user. Used when source data has no
// per-row author (content publishes, networking messages today).
function workspaceOwner(users: LiteUser[]): LiteUser | null {
  return users.find((u) => u.role === "owner") || users[0] || null;
}

type AutoRow = {
  userId: string;
  weekStart: string;
  platform: Platform;
  kind: ActivityKind;
  count: number;
  points: number;
  source: string;
  notes: string | null;
};

function buildContentRows(
  content: typeof schema.contentItems.$inferSelect[],
  owner: LiteUser
): AutoRow[] {
  const out: AutoRow[] = [];
  const cutoff = lookbackCutoff();

  for (const c of content) {
    const pairs: { date: Date | null; platform: Platform; tag: string; kind: ActivityKind }[] = [
      { date: c.linkedinPublishDate, platform: "linkedin", tag: "linkedin:publish", kind: "post" },
      { date: c.xPublishDate,        platform: "x",        tag: "x:publish",        kind: "post" },
      { date: c.facebookPublishDate, platform: "facebook", tag: "facebook:publish", kind: "post" },
      { date: c.linkedinReuseDate,   platform: "linkedin", tag: "linkedin:reuse",   kind: "post" },
      { date: c.xReuseDate,          platform: "x",        tag: "x:reuse",          kind: "post" },
      { date: c.facebookReuseDate,   platform: "facebook", tag: "facebook:reuse",   kind: "post" },
    ];

    for (const p of pairs) {
      if (!p.date || p.date < cutoff) continue;
      out.push({
        userId: owner.id,
        weekStart: weekStartFor(p.date),
        platform: p.platform,
        kind: p.kind,
        count: 1,
        points: pointsFor(p.platform, p.kind, 1),
        source: `content:${c.id}:${p.tag}`,
        notes: c.title ? `Content: ${c.title.slice(0, 120)}` : null,
      });
    }
  }
  return out;
}

function buildNetworkingRows(
  msgs: typeof schema.networkingMessages.$inferSelect[],
  owner: LiteUser
): AutoRow[] {
  const out: AutoRow[] = [];
  const cutoff = lookbackCutoff();
  for (const m of msgs) {
    if (m.status !== "sent" || !m.sentAt) continue;
    if (m.sentAt < cutoff) continue;
    const platform = normalizePlatform(m.channel) || "linkedin";
    out.push({
      userId: owner.id,
      weekStart: weekStartFor(m.sentAt),
      platform: platform === "other" ? "linkedin" : platform,
      kind: "dm",
      count: 1,
      points: pointsFor(platform === "other" ? "linkedin" : platform, "dm", 1),
      source: `networking_msg:${m.id}`,
      notes: m.topic ? `Networking: ${m.topic.slice(0, 100)}` : null,
    });
  }
  return out;
}

// Map a CRM activity type to a MARKETING kind. Only `comment_drafted` counts as
// marketing (engaging on prospects' content). Outreach types (dm/follow_up/email)
// now feed Sell or Die — see crmSalesKind below.
function crmActivityKind(t: string): ActivityKind | null {
  switch (t) {
    case "comment_drafted":  return "comment";
    default:                  return null;
  }
}

// Map a CRM activity type to a SALES kind. Outreach touches feed Sell or Die.
function crmSalesKind(t: string): SalesKind | null {
  switch (t) {
    case "dm_sent":          return "dm_sent";
    case "follow_up_sent":   return "follow_up";
    case "email_drafted":    return "dm_sent";     // count outbound effort as DM
    case "reply_received":   return null;          // inbound, not a sales action
    default:                 return null;
  }
}

// Map a free-text platform value to a sales Channel. Used when normalizing
// contacts.platform for CRM outreach rows going into sales_activities.
function normalizeSalesChannel(p: string | null | undefined): SalesChannel {
  const s = String(p || "").trim().toLowerCase();
  if (!s) return "linkedin";
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("email"))    return "email";
  if (s.includes("phone"))    return "phone";
  if (s.includes("zoom"))     return "zoom";
  if (s === "x" || s === "twitter") return "x";
  if (s.includes("facebook")) return "facebook";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("whatsapp")) return "whatsapp";
  return "other";
}

function buildCrmRows(
  rows: Array<{
    id: string;
    type: string;
    createdAt: Date | null;
    contactPlatform: string | null;
    ownerName: string | null;
    contactName: string | null;
  }>,
  users: LiteUser[],
  fallbackOwner: LiteUser
): AutoRow[] {
  const out: AutoRow[] = [];
  const cutoff = lookbackCutoff();
  for (const r of rows) {
    if (!r.createdAt || r.createdAt < cutoff) continue;
    const kind = crmActivityKind(r.type);
    if (!kind) continue;
    const platform = normalizePlatform(r.contactPlatform);
    const resolvedPlatform: Platform = platform === "other" ? "linkedin" : platform;
    const userId = resolveUserId(r.ownerName, users) || fallbackOwner.id;
    out.push({
      userId,
      weekStart: weekStartFor(r.createdAt),
      platform: resolvedPlatform,
      kind,
      count: 1,
      points: pointsFor(resolvedPlatform, kind, 1),
      source: `crm_activity:${r.id}`,
      notes: r.contactName ? `${r.type.replace(/_/g, " ")} · ${r.contactName.slice(0, 80)}` : r.type,
    });
  }
  return out;
}

type SalesAutoRow = {
  userId: string;
  weekStart: string;
  channel: SalesChannel;
  kind: SalesKind;
  count: number;
  points: number;
  source: string;
  notes: string | null;
};

function buildSalesRows(
  rows: Array<{
    id: string;
    type: string;
    createdAt: Date | null;
    contactPlatform: string | null;
    ownerName: string | null;
    contactName: string | null;
  }>,
  users: LiteUser[],
  fallbackOwner: LiteUser
): SalesAutoRow[] {
  const out: SalesAutoRow[] = [];
  const cutoff = lookbackCutoff();
  for (const r of rows) {
    if (!r.createdAt || r.createdAt < cutoff) continue;
    const kind = crmSalesKind(r.type);
    if (!kind) continue;
    const channel = normalizeSalesChannel(r.contactPlatform);
    const userId = resolveUserId(r.ownerName, users) || fallbackOwner.id;
    out.push({
      userId,
      weekStart: weekStartFor(r.createdAt),
      channel,
      kind,
      count: 1,
      points: salesPointsFor(channel, kind, 1),
      source: `crm_activity:${r.id}`,
      notes: r.contactName ? `${r.type.replace(/_/g, " ")} · ${r.contactName.slice(0, 80)}` : r.type,
    });
  }
  return out;
}

export type AutoSyncResult = {
  scanned: { content: number; networking: number; crm: number; sales: number };
  inserted: { content: number; networking: number; crm: number; sales: number; total: number };
  attribution: {
    workspaceOwner: { id: string; name: string } | null;
    unmappedOwnerNames: string[];
  };
};

export async function runMarketingAutoSync(): Promise<AutoSyncResult> {
  // 1. Load users (lite shape)
  const users: LiteUser[] = (
    await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        notionPerson: schema.users.notionPerson,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.active, 1))
  );
  const owner = workspaceOwner(users);
  if (!owner) {
    return {
      scanned: { content: 0, networking: 0, crm: 0, sales: 0 },
      inserted: { content: 0, networking: 0, crm: 0, sales: 0, total: 0 },
      attribution: { workspaceOwner: null, unmappedOwnerNames: [] },
    };
  }

  // 2. Pull source data
  const cutoff = lookbackCutoff();

  const content = await db.select().from(schema.contentItems);

  const networking = await db
    .select()
    .from(schema.networkingMessages)
    .where(eq(schema.networkingMessages.status, "sent"));

  const crmActivities = await db
    .select({
      id: schema.activities.id,
      type: schema.activities.type,
      createdAt: schema.activities.createdAt,
      contactPlatform: schema.contacts.platform,
      ownerName: schema.contacts.ownerName,
      contactName: schema.contacts.name,
    })
    .from(schema.activities)
    .leftJoin(schema.contacts, eq(schema.activities.contactId, schema.contacts.id))
    .where(and(
      isNotNull(schema.activities.createdAt),
      gte(schema.activities.createdAt, cutoff),
    ));

  // 3. Build rows
  const contentRows = buildContentRows(content, owner);
  const netRows = buildNetworkingRows(networking, owner);
  const crmRows = buildCrmRows(crmActivities, users, owner);
  const salesRows = buildSalesRows(crmActivities, users, owner);

  // 4. Track unmapped owner names (for surfacing back to the user)
  const unmapped = new Set<string>();
  for (const r of crmActivities) {
    if (r.ownerName && !resolveUserId(r.ownerName, users)) unmapped.add(r.ownerName);
  }

  // 5. Insert per source-type so we can report exact per-source counts.
  //    onConflictDoNothing on the source unique index makes this idempotent.
  async function insertRows(rows: AutoRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const res = await db
        .insert(schema.marketingActivities)
        .values(slice.map((r) => ({
          userId: r.userId,
          weekStart: r.weekStart,
          platform: r.platform,
          kind: r.kind,
          count: r.count,
          points: r.points,
          notes: r.notes,
          source: r.source,
        })))
        .onConflictDoNothing({ target: schema.marketingActivities.source })
        .returning({ id: schema.marketingActivities.id });
      inserted += res.length;
    }
    return inserted;
  }

  // Insert sales rows into sales_activities (separate table + unique-source
  // index — same idempotency guarantees as marketing).
  async function insertSalesRows(rows: SalesAutoRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const res = await db
        .insert(schema.salesActivities)
        .values(slice.map((r) => ({
          userId: r.userId,
          weekStart: r.weekStart,
          channel: r.channel,
          kind: r.kind,
          count: r.count,
          points: r.points,
          notes: r.notes,
          source: r.source,
        })))
        .onConflictDoNothing({ target: schema.salesActivities.source })
        .returning({ id: schema.salesActivities.id });
      inserted += res.length;
    }
    return inserted;
  }

  const insertedContent = await insertRows(contentRows);
  const insertedNetworking = await insertRows(netRows);
  const insertedCrm = await insertRows(crmRows);
  const insertedSales = await insertSalesRows(salesRows);
  const total = insertedContent + insertedNetworking + insertedCrm + insertedSales;

  return {
    scanned: {
      content: contentRows.length,
      networking: netRows.length,
      crm: crmRows.length,
      sales: salesRows.length,
    },
    inserted: {
      content: insertedContent,
      networking: insertedNetworking,
      crm: insertedCrm,
      sales: insertedSales,
      total,
    },
    attribution: {
      workspaceOwner: { id: owner.id, name: owner.name || "" },
      unmappedOwnerNames: Array.from(unmapped).sort(),
    },
  };
}
