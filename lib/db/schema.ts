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

    // Mirrored to/from Notion (added Round 4 — synced both ways).
    closedReason: text("closed_reason"),               // win/loss reason
    latestAuditSummary: text("latest_audit_summary"),  // most recent audit blurb

    // LLM-derived ICP classification (OpenRouter)
    icpClassification: text("icp_classification"),     // e.g. "Hot — AI SaaS founder" / "Cold — not ICP"
    icpClassifiedAt: ts("icp_classified_at"),

    // Attribution: which content piece (post, video, etc.) brought this contact in.
    // Local-only — set manually in dashboard or auto when Apify pipeline is wired.
    sourceContentId: text("source_content_id"),        // → content_items.id

    // Relation multi-select from Notion: how we built this contact's relationship.
    // JSON array of: "lead magnet" | "Open Conversation" | "Engager".
    // Feeds into lead scoring. When "lead magnet" is added, inferred-activities
    // auto-promotes status to "Lead" if currently below.
    relation: text("relation"),

    // Lead owner — pulled from the Notion "Person" column. Matches by name
    // (case-insensitive) against the local users table to compute "my leads".
    ownerName: text("owner_name"),

    // Top 50 long-term relationship list — checkbox from Notion CRM.
    // /top-50 page surfaces these for CSV download (all + per platform).
    top50: integer("top50").notNull().default(0),

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
    type: text("type"),                          // storytelling | lead magnet | Contrarian | educational | informational
    topics: text("topics"),                      // far past | recent past | present | trending | manufactured
    repurposePlatform: text("repurpose_platform"),  // JSON multi-select
    reusePlatform: text("reuse_platform"),          // JSON multi-select

    // Per-platform tracking (LinkedIn / X / Facebook)
    linkedinStatus: text("linkedin_status"),
    xStatus: text("x_status"),
    facebookStatus: text("facebook_status"),
    linkedinPublishDate: ts("linkedin_publish_date"),
    xPublishDate: ts("x_publish_date"),
    facebookPublishDate: ts("facebook_publish_date"),
    linkedinReuseDate: ts("linkedin_reuse_date"),
    xReuseDate: ts("x_reuse_date"),
    facebookReuseDate: ts("facebook_reuse_date"),
    linkedinUrl: text("linkedin_url"),
    xUrl: text("x_url"),
    facebookUrl: text("facebook_url"),
    linkedinMetrics: text("linkedin_metrics"),     // free text — engagement summary (Apify target)
    xMetrics: text("x_metrics"),
    facebookMetrics: text("facebook_metrics"),
    linkedinEngagedPeople: text("linkedin_engaged_people"),  // CSV of file URLs (Apify target)
    xEngagedPeople: text("x_engaged_people"),
    facebookEngagedPeople: text("facebook_engaged_people"),

    // Reserved for Claude Code drafts (currently unused but cheap to keep)
    bodyMarkdown: text("body_markdown"),
    claudeRunId: text("claude_run_id"),

    createdAt: now(),
    updatedAt: ts("updated_at").$defaultFn(() => new Date()),
    dirty: integer("dirty").notNull().default(0),
  },
  (t) => ({
    linkedinPublishIdx: index("content_linkedin_publish_idx").on(t.linkedinPublishDate),
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
    // type: post_observed | comment_drafted | email_drafted | audit_run | follow_up_sent
    //     | dm_sent | reply_received | note
    type: text("type").notNull(),
    content: text("content").notNull().default(""),
    sourceUrl: text("source_url"),
    claudeRunId: text("claude_run_id"),
    // Inbox features:
    // - channel: which platform the message arrived on (linkedin | x | facebook
    //   | whatsapp | slack | reddit | email | comment | other). Defaults to
    //   the contact's primary platform if not set.
    channel: text("channel"),
    // - needs_reply: 1 = inbox item needing your response. Set on reply_received.
    //   Cleared (and replied_at stamped) when you mark replied.
    needsReply: integer("needs_reply").notNull().default(0),
    repliedAt: ts("replied_at"),
    createdAt: now(),
  },
  (t) => ({
    contactCreatedIdx: index("activities_contact_created_idx").on(t.contactId, t.createdAt),
    needsReplyIdx: index("activities_needs_reply_idx").on(t.needsReply),
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

  // Legacy scalar counters — kept for backwards compat with dashboard/scorecard
  coldDmsSent: integer("cold_dms_sent").default(0),
  coldEmailsSent: integer("cold_emails_sent").default(0),
  followUpsSent: integer("follow_ups_sent").default(0),
  warmDmsSent: integer("warm_dms_sent").default(0),
  responses: integer("responses").default(0),
  callsBooked: integer("calls_booked").default(0),
  commentsOnProspects: integer("comments_on_prospects").default(0),
  newProspects: integer("new_prospects").default(0),
  inboundLeads: integer("inbound_leads").default(0),

  // NEW: Per-platform per-action breakdown as JSON.
  // Shape: { linkedin: { dm: 5, connect: 10, comment: 15, follow_up: 3 }, x: {...}, facebook: {...}, instagram: {...}, reddit: {...}, email: { dm: 8, follow_up: 2 } }
  // Updated via 1-tap +1 buttons on /daily-sales.
  breakdown: text("breakdown"),

  // NEW: Other outreach counters (not per-platform)
  leadMagnetsSent: integer("lead_magnets_sent").default(0),
  engagerDms: integer("engager_dms").default(0),                  // DMs to people who engaged with my posts

  // NEW: Revenue metrics (stored in cents)
  revenueGenerated: integer("revenue_generated").default(0),
  pipelineAdded: integer("pipeline_added").default(0),
  avgDealSize: integer("avg_deal_size").default(0),

  // NEW: Win analysis + sales notes as JSON.
  // Shape: { bestChannel, bestMessage, bestTimeOfDay, lossReason, objectionsFaced, improvementNeeded, hotLeadsTomorrow, workingTemplates, objectionHandlers, competitorIntel }
  winAnalysis: text("win_analysis"),

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

// Lead score per contact, recomputed on activity insert + nightly.
// Score = stage_weight + recency + engagement_count + reply_ratio (0..100).
export const leadScores = sqliteTable("lead_scores", {
  contactId: text("contact_id").primaryKey().references(() => contacts.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  stageWeight: integer("stage_weight").notNull().default(0),
  recencyScore: integer("recency_score").notNull().default(0),
  engagementScore: integer("engagement_score").notNull().default(0),
  replyScore: integer("reply_score").notNull().default(0),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

// Meetings — pulled from Calendly (and any other future booker).
// One row per scheduled event. Linked to a contact when we can match by email/name;
// otherwise contactId is null and the user can link manually.
export const meetings = sqliteTable("meetings", {
  id: id(),
  externalId: text("external_id").unique(),     // Calendly event UUID
  source: text("source").notNull().default("calendly"),  // calendly | manual | etc.
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  inviteeName: text("invitee_name"),
  inviteeEmail: text("invitee_email"),
  eventName: text("event_name"),                 // "Discovery Call — 30min"
  scheduledAt: ts("scheduled_at"),
  endedAt: ts("ended_at"),
  status: text("status"),                         // active | canceled | completed
  meetingUrl: text("meeting_url"),                // Zoom/Meet link
  rescheduleUrl: text("reschedule_url"),
  cancelUrl: text("cancel_url"),
  questionsAndAnswers: text("questions_and_answers"),  // JSON of intake form responses
  notes: text("notes"),
  createdAt: now(),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
}, (t) => ({
  scheduledIdx: index("meetings_scheduled_idx").on(t.scheduledAt),
  contactIdx: index("meetings_contact_idx").on(t.contactId),
}));

export const syncLog = sqliteTable("sync_log", {
  id: id(),
  entity: text("entity").notNull(), // contacts | tracker_entries | content_items
  direction: text("direction").notNull(), // pull | push
  startedAt: ts("started_at").notNull().$defaultFn(() => new Date()),
  finishedAt: ts("finished_at"),
  rowsChanged: integer("rows_changed").default(0),
  error: text("error"),
});

// LLM response cache (OpenRouter calls hashed by prompt+model, with TTL).
// Free tier rate-limited so we cache aggressively.
export const aiCache = sqliteTable("ai_cache", {
  cacheKey: text("cache_key").primaryKey(),    // sha1(model + ":" + prompt)
  model: text("model").notNull(),
  response: text("response").notNull(),
  createdAt: now(),
  expiresAt: ts("expires_at").notNull(),
});

// Multi-role auth users. role: "owner" | "admin" | "salesperson" | "viewer".
// "owner" is the root account — full access + manages every role incl. admins.
//   Cannot be demoted or deactivated by anyone else; only one per workspace.
// "admin" — full app access + manages salespeople/viewers (NOT other admins/owner).
// "salesperson" — runs outreach workflows + sees their own leads.
// "viewer" — read-only.
export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("salesperson"),
  active: integer("active").notNull().default(1),
  // Optional override that maps this user to the Notion "Person" column value
  // on CRM contacts. If null we fall back to matching by `name`. This lets
  // auto-sync attribute CRM/content/networking activity to the right teammate
  // even when Notion's display name differs from the app display name.
  notionPerson: text("notion_person"),
  createdAt: now(),
  lastLoginAt: ts("last_login_at"),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

// "Market or Die" gamification — every marketing activity a team member logs
// is a row here. Points awarded per row come from lib/marketing/points.ts.
// week_start is Monday of the week (UTC date YYYY-MM-DD) so the leaderboard
// can group cheaply.
export const marketingActivities = sqliteTable("marketing_activities", {
  id: id(),
  userId: text("user_id").notNull(),                  // → users.id
  weekStart: text("week_start").notNull(),            // ISO date, Monday of the week
  platform: text("platform").notNull(),               // linkedin | x | youtube | tiktok | reddit | instagram | blog | other
  kind: text("kind").notNull(),                       // post | video | short | story | comment | dm | blog_post | channel_setup | …
  count: integer("count").notNull().default(1),
  points: integer("points").notNull(),                // points awarded (count × per-unit value)
  notes: text("notes"),
  // Idempotency key for auto-logged rows. Manual entries leave this null.
  // Format: "content:<contentId>:<platform>:publish" | "content:<id>:<platform>:reuse"
  //       | "crm_activity:<activityId>" | "networking_msg:<msgId>"
  // Unique index prevents double-counting on re-sync.
  source: text("source"),
  createdAt: now(),
}, (t) => ({
  userWeekIdx: index("marketing_activities_user_week_idx").on(t.userId, t.weekStart),
  weekIdx: index("marketing_activities_week_idx").on(t.weekStart),
  sourceUnique: uniqueIndex("marketing_activities_source_unique").on(t.source),
}));

// Per-user weekly target overrides. When no row exists for a (user, week),
// the target is derived from the user's level (see lib/marketing/points.ts).
export const marketingWeeklyTargets = sqliteTable("marketing_weekly_targets", {
  id: id(),
  userId: text("user_id").notNull(),
  weekStart: text("week_start").notNull(),
  targetPoints: integer("target_points").notNull(),
  setBy: text("set_by"),                              // user id who set it
  createdAt: now(),
}, (t) => ({
  userWeekUnique: uniqueIndex("marketing_targets_user_week_unique").on(t.userId, t.weekStart),
}));

// Generic key/value app settings. JSON values keyed by name.
// First user: outreach limits + active window overrides (see lib/outreach-config.ts).
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
});

// Personal Relationship Manager — networking contacts mirrored from a Notion
// PRM database. Separate from the Sales CRM `contacts` table so networking
// (friends, peers, advisors, founders, partners) lives in its own lifecycle.
export const networkingContacts = sqliteTable("networking_contacts", {
  id: id(),
  notionPageId: text("notion_page_id").unique(),
  notionLastSyncedAt: ts("notion_last_synced_at"),
  notionLastEditedAt: ts("notion_last_edited_at"),

  name: text("name").notNull().default(""),
  // High-level relationship lens — "friend", "peer", "advisor", "founder", etc.
  relationship: text("relationship"),
  // Where you met / first connected
  source: text("source"),
  // Profile / platform links (LinkedIn most common, but kept generic)
  profileUrl: text("profile_url"),
  email: text("email"),
  phone: text("phone"),
  platform: text("platform"),
  location: text("location"),

  // Lightweight personal context for the wizard's recipient summary
  profession: text("profession"),
  company: text("company"),
  role: text("role"),
  position: text("position"),            // specific title (separate from "role")
  interests: text("interests"),          // JSON array of strings
  tags: text("tags"),                    // JSON array

  // Recent activity / latest post — used by the Write Message wizard to ground
  // the message in something current. Manual paste OR mirrored from a Notion
  // "Recent Post" column. Auto-scrape from social platforms is a future option.
  recentPost: text("recent_post"),
  recentPostUrl: text("recent_post_url"),

  // Pipeline / lifecycle on the networking side
  stage: text("stage"),                  // free-text or enum: Start / Maintain / Focus / etc.
  lastContactAt: ts("last_contact_at"),
  nextFollowUpAt: ts("next_follow_up_at"),

  // Free-form notes / coaching text
  notes: text("notes"),

  createdAt: now(),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
  dirty: integer("dirty").notNull().default(0),
}, (t) => ({
  nameIdx: index("networking_contacts_name_idx").on(t.name),
  stageIdx: index("networking_contacts_stage_idx").on(t.stage),
  followUpIdx: index("networking_contacts_follow_up_idx").on(t.nextFollowUpAt),
}));

// Messages drafted via the Write Message wizard, threaded to a networking contact.
// Stores all wizard inputs so a message can be re-edited later, plus the three
// generated variants (Short / Standard / Detailed) and the user's chosen one.
export const networkingMessages = sqliteTable("networking_messages", {
  id: id(),
  contactId: text("contact_id").notNull(),    // → networking_contacts.id

  // Wizard inputs (all optional except topic)
  purpose: text("purpose"),                   // step 2
  contextChips: text("context_chips"),        // JSON array (max 3)
  contextDetail: text("context_detail"),
  ctaChips: text("cta_chips"),                // JSON array (max 3)
  tone: text("tone"),
  framework: text("framework"),               // ACA, AIDA, PAS, FAB, BAB, QUEST, etc.
  channel: text("channel"),                   // Inbox / Email / Other
  language: text("language"),                 // English / Bengali / Other
  topic: text("topic"),

  // Generated output (single LLM call returns three lengths)
  generatedShort: text("generated_short"),
  generatedStandard: text("generated_standard"),
  generatedDetailed: text("generated_detailed"),
  chosenVariant: text("chosen_variant"),      // 'short' | 'standard' | 'detailed'

  // Quality + lifecycle
  strengthScore: integer("strength_score"),   // 0-100, computed from inputs
  status: text("status").notNull().default("draft"),  // draft | sent | responded
  sentAt: ts("sent_at"),
  responseAt: ts("response_at"),
  responseType: text("response_type"),        // positive | negative | none

  createdAt: now(),
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
}, (t) => ({
  contactIdx: index("networking_messages_contact_idx").on(t.contactId),
  statusIdx: index("networking_messages_status_idx").on(t.status),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MarketingActivity = typeof marketingActivities.$inferSelect;
export type NewMarketingActivity = typeof marketingActivities.$inferInsert;
export type MarketingTarget = typeof marketingWeeklyTargets.$inferSelect;
export type NewMarketingTarget = typeof marketingWeeklyTargets.$inferInsert;
export type UserRole = "owner" | "admin" | "salesperson" | "viewer";

// Ordered most-privileged → least-privileged. Used for permission checks like
// "this action requires admin or higher".
export const ROLE_RANK: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  salesperson: 40,
  viewer: 10,
};
export function roleAtLeast(role: UserRole | null | undefined, min: UserRole): boolean {
  if (!role) return false;
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK[min];
}
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type NetworkingContact = typeof networkingContacts.$inferSelect;
export type NewNetworkingContact = typeof networkingContacts.$inferInsert;
export type NetworkingMessage = typeof networkingMessages.$inferSelect;
export type NewNetworkingMessage = typeof networkingMessages.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type TrackerEntry = typeof trackerEntries.$inferSelect;
export type DailySalesKpi = typeof dailySalesKpis.$inferSelect;
export type ClaudeRun = typeof claudeRuns.$inferSelect;
export type SyncLog = typeof syncLog.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
