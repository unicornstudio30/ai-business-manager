import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { ulid } from "ulid";

const id = () => text("id").primaryKey().$defaultFn(() => ulid());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = () => integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date());

// ─────────────────────────────────────────────────────────────────────────────
// NOTION-BACKED TABLES (mirrors of 3 Notion databases)
// ─────────────────────────────────────────────────────────────────────────────

export const contacts = sqliteTable(
  "contacts",
  {
    id: id(),
    notionPageId: text("notion_page_id").unique(),
    notionLastSyncedAt: ts("notion_last_synced_at"),
    notionLastEditedAt: ts("notion_last_edited_at"),

    name: text("name").notNull().default(""),
    email: text("email"),
    contactUrl: text("contact_url"),
    otherContactUrl: text("other_contact_url"),
    websiteUrl: text("website_url"),
    country: text("country"),
    platform: text("platform"),

    // JSON arrays
    category: text("category"),       // ["Outbound","Inbound"]
    position: text("position"),       // multi
    profession: text("profession"),   // multi

    status: text("status"),           // 18-stage enum (see lib/stages.ts)
    statusDate: ts("status_date"),
    followUpDate: ts("follow_up_date"),
    closedDate: ts("closed_date"),
    savedDate: ts("saved_date"),

    connectionType: text("connection_type"),
    invitationType: text("invitation_type"),
    engageTouch: integer("engage_touch"),     // 1..5+ — sequence step
    crossOutreach: text("cross_outreach"),
    remarks: text("remarks"),

    // DM sequence engine (local-only)
    sequenceTrack: text("sequence_track"),    // "linkedin" | "facebook"
    lastTouchAt: ts("last_touch_at"),
    lastScannedAt: ts("last_scanned_at"),

    createdAt: now(),
    updatedAt: ts("updated_at").$defaultFn(() => new Date()),
    dirty: integer("dirty").notNull().default(0),
  },
  (t) => ({
    statusIdx: index("contacts_status_idx").on(t.status),
    followUpIdx: index("contacts_follow_up_idx").on(t.followUpDate),
    statusDateIdx: index("contacts_status_date_idx").on(t.statusDate),
  })
);

export const trackerEntries = sqliteTable("tracker_entries", {
  id: id(),
  notionPageId: text("notion_page_id").unique(),
  notionLastSyncedAt: ts("notion_last_synced_at"),
  notionLastEditedAt: ts("notion_last_edited_at"),

  name: text("name").notNull().default(""),
  tags: text("tags"),               // JSON array
  notionCreatedAt: ts("notion_created_at"),
  bodyMarkdown: text("body_markdown"),

  createdAt: now(),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
  dirty: integer("dirty").notNull().default(0),
});

export const contentItems = sqliteTable(
  "content_items",
  {
    id: id(),
    notionPageId: text("notion_page_id").unique(),
    notionLastSyncedAt: ts("notion_last_synced_at"),
    notionLastEditedAt: ts("notion_last_edited_at"),

    title: text("title").notNull().default(""),
    topic: text("topic"),
    engagement: text("engagement"),
    framework: text("framework"),
    url: text("url"),
    type: text("type"),                          // 15 options (see lib/content-types.ts)
    status: text("status"),                      // Idea, In Progress, In Review, Done, Published
    contentMethod: text("content_method"),
    readyToPostPlatform: text("ready_to_post_platform"),  // JSON
    reusePlatform: text("reuse_platform"),                // JSON
    repurposePlatform: text("repurpose_platform"),        // JSON
    publishDate: ts("publish_date"),
    reuseDate: ts("reuse_date"),
    assignUserIds: text("assign_user_ids"),              // JSON
    bodyMarkdown: text("body_markdown"),
    claudeRunId: text("claude_run_id"),

    createdAt: now(),
    updatedAt: ts("updated_at").$defaultFn(() => new Date()),
    dirty: integer("dirty").notNull().default(0),
  },
  (t) => ({
    statusIdx: index("content_status_idx").on(t.status),
    publishIdx: index("content_publish_idx").on(t.publishDate),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL-ONLY TABLES
// ─────────────────────────────────────────────────────────────────────────────

export const activities = sqliteTable(
  "activities",
  {
    id: id(),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // post_observed | comment_drafted | email_drafted | audit_run | follow_up_sent | dm_sent | note
    content: text("content").notNull().default(""),
    sourceUrl: text("source_url"),
    claudeRunId: text("claude_run_id"),
    createdAt: now(),
  },
  (t) => ({
    contactCreatedIdx: index("activities_contact_created_idx").on(t.contactId, t.createdAt),
  })
);

export const projects = sqliteTable("projects", {
  id: id(),
  name: text("name").notNull(),
  contactId: text("contact_id").references(() => contacts.id),
  serviceLine: text("service_line"),    // AI Systems | AI Integrations | AI Solutions | AI SaaS | Website | Branding
  scopeSummary: text("scope_summary"),
  startDate: ts("start_date"),
  dueDate: ts("due_date"),
  status: text("status"),                // briefing | building | qa | delivered | maintenance | closed
  price: integer("price"),
  setupFee: integer("setup_fee"),
  monthlyRetainer: integer("monthly_retainer"),
  deliverables: text("deliverables"),    // JSON
  blockers: text("blockers"),
  notes: text("notes"),
  createdAt: now(),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
});

export const audits = sqliteTable("audits", {
  id: id(),
  contactId: text("contact_id").references(() => contacts.id),
  url: text("url").notNull(),
  summary: text("summary"),
  scores: text("scores"),               // JSON: {design, copy, conversion, speed_signal}
  detectedStack: text("detected_stack"),
  missingPages: text("missing_pages"),
  emailDraft: text("email_draft"),
  claudeRunId: text("claude_run_id"),
  createdAt: now(),
});

export const partners = sqliteTable("partners", {
  id: id(),
  contactId: text("contact_id").references(() => contacts.id),
  firstProjectDate: ts("first_project_date"),
  totalRevenue: integer("total_revenue").default(0),
  projectsCount: integer("projects_count").default(0),
  satisfaction: integer("satisfaction"), // 1-5
  lastTouchpoint: ts("last_touchpoint"),
  notes: text("notes"),
  createdAt: now(),
});

export const networkingActivities = sqliteTable("networking_activities", {
  id: id(),
  date: ts("date").notNull(),
  activityType: text("activity_type"),
  platform: text("platform"),
  name: text("name"),
  action: text("action"),
  leadMagnetShared: text("lead_magnet_shared"),
  followUpNeeded: integer("follow_up_needed", { mode: "boolean" }).default(false),
  followUpDate: ts("follow_up_date"),
  outcome: text("outcome"),
  notes: text("notes"),
  createdAt: now(),
});

export const communities = sqliteTable("communities", {
  id: id(),
  name: text("name").notNull(),
  platform: text("platform"),
  type: text("type"),
  members: integer("members"),
  joinDate: ts("join_date"),
  engagementLevel: text("engagement_level"),
  leadMagnetsShared: integer("lead_magnets_shared").default(0),
  leadsGenerated: integer("leads_generated").default(0),
  createdAt: now(),
});

export const referralPartners = sqliteTable("referral_partners", {
  id: id(),
  name: text("name").notNull(),
  company: text("company"),
  type: text("type"),
  howMet: text("how_met"),
  status: text("status"),
  firstContact: ts("first_contact"),
  lastContact: ts("last_contact"),
  referralsSent: integer("referrals_sent").default(0),
  referralsReceived: integer("referrals_received").default(0),
  incentive: text("incentive"),
  notes: text("notes"),
  createdAt: now(),
});

export const financeEntries = sqliteTable("finance_entries", {
  id: id(),
  date: ts("date").notNull(),
  contactId: text("contact_id").references(() => contacts.id),
  projectId: text("project_id").references(() => projects.id),
  lineItem: text("line_item"),
  amount: integer("amount").notNull(),
  status: text("status"),     // draft | sent | paid | overdue
  paymentDate: ts("payment_date"),
  notes: text("notes"),
  createdAt: now(),
});

export const dailySalesKpis = sqliteTable("daily_sales_kpis", {
  id: id(),
  date: ts("date").notNull(),
  coldDmsSent: integer("cold_dms_sent").default(0),
  coldEmailsSent: integer("cold_emails_sent").default(0),
  followUpsSent: integer("follow_ups_sent").default(0),
  warmDmsSent: integer("warm_dms_sent").default(0),
  responses: integer("responses").default(0),
  callsBooked: integer("calls_booked").default(0),
  commentsOnProspects: integer("comments_on_prospects").default(0),
  newProspects: integer("new_prospects").default(0),
  inboundLeads: integer("inbound_leads").default(0),
  notes: text("notes"),
  createdAt: now(),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
}, (t) => ({
  dateIdx: uniqueIndex("kpis_date_idx").on(t.date),
}));

export const claudeRuns = sqliteTable("claude_runs", {
  id: id(),
  command: text("command").notNull(),
  startedAt: ts("started_at").notNull().$defaultFn(() => new Date()),
  finishedAt: ts("finished_at"),
  status: text("status").notNull().default("running"), // running | success | error
  summary: text("summary"),
  args: text("args"),  // JSON
});

export const syncLog = sqliteTable("sync_log", {
  id: id(),
  entity: text("entity").notNull(), // contacts | tracker_entries | content_items
  direction: text("direction").notNull(), // pull | push
  startedAt: ts("started_at").notNull().$defaultFn(() => new Date()),
  finishedAt: ts("finished_at"),
  rowsChanged: integer("rows_changed").default(0),
  error: text("error"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type TrackerEntry = typeof trackerEntries.$inferSelect;
export type DailySalesKpi = typeof dailySalesKpis.$inferSelect;
export type ClaudeRun = typeof claudeRuns.$inferSelect;
export type SyncLog = typeof syncLog.$inferSelect;
