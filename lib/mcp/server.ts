// MCP server definition — exposes Unicorn Studio's web app as tools for Claude.
// Reuses all existing query/mutation code; doesn't duplicate logic.
//
//   READ: briefing, list_contacts, get_contact, hot_leads, needs_follow_up,
//         engagement_queue, cadences_due, icp_score, analytics, inbox,
//         stuck_deals, wins_losses, prep_brief, upcoming_meetings,
//         stage_definitions
//   WRITE: create_activity, sync_notion, sync_gcal, save_audit
//   AI:    next_message, stuck_suggestion, daily_summary, classify_icp
//         (server-side OpenRouter — callable from Claude.ai)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  getDashboardStats,
  getHotLeads,
  getNeedsFollowUp,
  getStageGroupCounts,
  getContactById,
  getContactActivities,
  listContacts,
  getTodayKpi,
  getYesterdayKpi,
} from "@/lib/db/queries";
import { listEngagementQueue, getTodayCounts, DAILY_TARGETS } from "@/lib/db/engagement";
import { computeCadence, dueToday, dueSoon } from "@/lib/cadences";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { funnelCounts, activityTrend30d } from "@/lib/db/analytics";
import { upcomingMeetings, recentMeetings } from "@/lib/db/meetings";
import { syncGoogleCalendar } from "@/lib/gcal/sync";
import { inboxView, inboxCounts } from "@/lib/db/inbox-view";
import { INBOX_CHANNELS } from "@/lib/inbox";
import { stuckDeals, stuckByStage } from "@/lib/db/stuck-deals";
import { listClosedDeals, winLossSummary } from "@/lib/db/wins-losses";
import { buildPrepBrief } from "@/lib/prep-brief";
import { computeIcpScore } from "@/lib/icp-scoring";
import { syncNotion, syncStatus } from "@/lib/notion/sync";
import { STAGES } from "@/lib/stages";
import { generateNextMessage } from "@/lib/ai/next-message";
import { getStuckSuggestion } from "@/lib/ai/stuck-suggestion";
import { getDailySummary } from "@/lib/ai/daily-summary";
import { classifyContact } from "@/lib/ai/classify-icp";
import { draftComment } from "@/lib/ai/comment-draft";
import { getHistory, type HistoryEventType } from "@/lib/db/history";

// Networking (PRM) — for the Claude-UI message drafting workflow
import { listNetworkingContacts, getNetworkingContact } from "@/lib/db/networking-contacts";
import { getMessagesForContact, getLastMessageForContact, createMessage, updateMessage } from "@/lib/db/networking-messages";
import { getNetworkingNextDrafts } from "@/lib/db/networking-next-drafts";
import { getNetworkingAnalytics } from "@/lib/db/networking-analytics";
import { FRAMEWORKS } from "@/lib/ai/write-message";
import { parseProfileFromImage, parseProfileFromText, parseProfileFromUrl } from "@/lib/ai/profile-parse";
import { parseJson } from "@/lib/utils";

// Sales — active clients (Partnership stage)
import { getClientsView } from "@/lib/db/clients";

// Outreach safety limits + active window (read/write)
import { getOutreachConfig, saveOutreachConfig, type OutreachConfig } from "@/lib/outreach-config";
import { PLATFORM_LIMITS, type PlatformKey, type ActionKey } from "@/lib/sales-limits";

// Workspace users + roles (read-only over MCP — destructive ops live in /admin)
import { listUsers } from "@/lib/auth/users";

// Market or Die — weekly marketing leaderboard (read-only)
import { getLeaderboard } from "@/lib/db/marketing";
import { weekStartFor, fmtWeekLabel } from "@/lib/marketing/points";

// JSON-serialize a result wrapping it as MCP text content.
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "unicorn-studio-business-manager",
    version: "1.0.0",
  });

  // ─────────── READ TOOLS ───────────

  server.registerTool(
    "briefing",
    {
      title: "Daily Briefing",
      description:
        "Aggregated daily briefing: total contacts, hot leads, active clients, needs follow-up, " +
        "stage counts, top hot leads, follow-ups due, today/yesterday KPIs, sync status. " +
        "Use this for morning summaries.",
      inputSchema: {},
    },
    async () => {
      const [stats, groups, hot, followUps, today, yesterday, sync] = await Promise.all([
        getDashboardStats(),
        getStageGroupCounts(),
        getHotLeads(10),
        getNeedsFollowUp(11, 10),
        getTodayKpi(),
        getYesterdayKpi(),
        syncStatus(),
      ]);
      const yesterdayMissing =
        !yesterday || (!yesterday.coldDmsSent && !yesterday.coldEmailsSent &&
          !yesterday.followUpsSent && !yesterday.inboundLeads);
      return ok({
        timestamp: new Date().toISOString(),
        stats,
        stageGroups: groups,
        hotLeads: hot,
        needsFollowUp: followUps,
        todayKpi: today,
        yesterdayKpi: yesterday,
        yesterdayMissing,
        sync,
      });
    }
  );

  server.registerTool(
    "list_contacts",
    {
      title: "List Contacts",
      description: "List contacts filtered by stage, country, platform, or search. Sorted by status date desc.",
      inputSchema: {
        status: z.string().optional().describe("One of the 18 pipeline stages (see lib/stages.ts)"),
        country: z.string().optional(),
        platform: z.string().optional().describe("Linkedin, X, Facebook, Whatsapp, Slack, Reddit"),
        search: z.string().optional().describe("Substring match on name or email"),
        limit: z.number().int().min(1).max(200).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      },
    },
    async (args) => {
      const rows = await listContacts({
        status: args.status,
        country: args.country,
        platform: args.platform,
        search: args.search,
        limit: args.limit ?? 50,
        offset: args.offset ?? 0,
      });
      return ok({ count: rows.length, contacts: rows });
    }
  );

  server.registerTool(
    "get_contact",
    {
      title: "Get Contact",
      description: "Get one contact's full record + their last 50 activities (post observations, comment drafts, DMs, etc.).",
      inputSchema: {
        id: z.string().describe("Contact id (ULID)"),
      },
    },
    async ({ id }) => {
      const contact = await getContactById(id);
      if (!contact) return ok({ error: "Contact not found", id });
      const activities = await getContactActivities(id);
      return ok({ contact, activities });
    }
  );

  server.registerTool(
    "hot_leads",
    {
      title: "Hot Leads",
      description:
        "Contacts in 'hot' stages (Lead, 1st/2nd Lead Follow up, Qualified, Proposal Sent, Post Proposal Follow-up-1/2, Booking, First call) — ordered by status date desc.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().default(20),
      },
    },
    async ({ limit }) => {
      const rows = await getHotLeads(limit ?? 20);
      return ok({ count: rows.length, hot_leads: rows });
    }
  );

  server.registerTool(
    "needs_follow_up",
    {
      title: "Contacts Needing Follow-up",
      description: "Contacts with no movement for N+ days (default 11) and not in a terminal stage.",
      inputSchema: {
        days: z.number().int().min(1).optional().default(11),
        limit: z.number().int().min(1).max(50).optional().default(20),
      },
    },
    async ({ days, limit }) => {
      const rows = await getNeedsFollowUp(days ?? 11, limit ?? 20);
      return ok({ count: rows.length, contacts: rows });
    }
  );

  server.registerTool(
    "engagement_queue",
    {
      title: "Engagement Queue",
      description:
        "Cross-contact daily queue ranked by lead score. Each entry has the contact, their score, " +
        "and their most recent activity. Use this to identify who to engage with today.",
      inputSchema: {
        onlyHot: z
          .boolean()
          .optional()
          .default(true)
          .describe("If true (default), only contacts in hot stages. If false, all contacts."),
        limit: z.number().int().min(1).max(100).optional().default(50),
      },
    },
    async ({ onlyHot, limit }) => {
      const queue = await listEngagementQueue({
        onlyHot: onlyHot ?? true,
        limit: limit ?? 50,
      });
      const todayCounts = await getTodayCounts();
      return ok({
        queue,
        today_counts: todayCounts,
        daily_targets: DAILY_TARGETS,
      });
    }
  );

  server.registerTool(
    "cadences_due",
    {
      title: "Cadences Due",
      description:
        "Contacts whose next DM-sequence step is due. Returns 'due_today' (overdue first) and 'due_soon' (next N days). " +
        "Uses the 7-step LinkedIn / 8-step Facebook templates in lib/sequences.ts.",
      inputSchema: {
        withinDays: z.number().int().min(0).optional().default(3),
      },
    },
    async ({ withinDays }) => {
      const contacts = await db.select().from(schema.contacts);
      const items = contacts
        .map((c) => computeCadence(c))
        .filter((x): x is NonNullable<typeof x> => x !== null);
      return ok({
        due_today: dueToday(items),
        due_soon: dueSoon(items, withinDays ?? 3),
      });
    }
  );

  server.registerTool(
    "analytics",
    {
      title: "Pipeline Analytics",
      description: "Pipeline funnel counts (Cold→Won) + 30-day activity trend.",
      inputSchema: {},
    },
    async () => {
      const [funnel, trend] = await Promise.all([funnelCounts(), activityTrend30d()]);
      return ok({ funnel, activity_trend_30d: trend });
    }
  );

  server.registerTool(
    "stage_definitions",
    {
      title: "Stage Definitions",
      description:
        "Returns the canonical list of all 18 pipeline stages in order, and their dashboard-group mapping (Cold/Engaged/Qualified/Proposal/Call/Won/Archive).",
      inputSchema: {},
    },
    async () => {
      const { STAGE_GROUPS } = await import("@/lib/stages");
      return ok({ stages: STAGES, stage_groups: STAGE_GROUPS });
    }
  );

  server.registerTool(
    "upcoming_meetings",
    {
      title: "Upcoming Meetings",
      description:
        "Upcoming + recent meetings from Google Calendar (synced via ICS). " +
        "Returns up to 'limit' future events plus 'recentDays' days of past events. " +
        "Each meeting links to its contact when invitee email matches.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().default(20),
        recentDays: z.number().int().min(0).max(60).optional().default(7),
      },
    },
    async ({ limit, recentDays }) => {
      const [upcoming, recent] = await Promise.all([
        upcomingMeetings(limit ?? 20),
        recentMeetings(recentDays ?? 7, 20),
      ]);
      return ok({ upcoming, recent });
    }
  );

  server.registerTool(
    "inbox",
    {
      title: "Inbox (needs your move)",
      description:
        "Returns contacts who need a response — derived from Notion CRM. " +
        "A contact appears here if their Follow-up Date is past, or they're in a waiting stage and last touched 3+ days ago. " +
        "Optionally filter by channel (linkedin, x, facebook, whatsapp, slack, reddit, email).",
      inputSchema: {
        channel: z.enum(INBOX_CHANNELS).optional(),
      },
    },
    async ({ channel }) => {
      const [items, counts] = await Promise.all([inboxView({ channel }), inboxCounts()]);
      return ok({ items, counts });
    }
  );

  server.registerTool(
    "save_audit",
    {
      title: "Save Site Audit (write)",
      description:
        "Save a site audit + drafted ACA email to the audits table. Used by the /audit slash command. " +
        "If contact_id is provided, the audit links to that contact and shows on /audits.",
      inputSchema: {
        url: z.string().describe("URL that was audited"),
        summary: z.string().optional().describe("2-3 sentence honest read"),
        scores: z.record(z.string(), z.number()).optional().describe("e.g. {design:4, copy:3, conversion:4, speed_signal:3}"),
        detected_stack: z.array(z.string()).optional().describe("e.g. ['WordPress','Elementor']"),
        missing_pages: z.array(z.string()).optional().describe("e.g. ['/case-studies','/pricing']"),
        email_draft: z.string().optional().describe("Full ACA outreach email markdown"),
        contact_id: z.string().optional(),
      },
    },
    async ({ url, summary, scores, detected_stack, missing_pages, email_draft, contact_id }) => {
      const [row] = await db
        .insert(schema.audits)
        .values({
          url,
          contactId: contact_id ?? null,
          summary: summary ?? null,
          scores: scores ? JSON.stringify(scores) : null,
          detectedStack: detected_stack ? JSON.stringify(detected_stack) : null,
          missingPages: missing_pages ? JSON.stringify(missing_pages) : null,
          emailDraft: email_draft ?? null,
        })
        .returning();
      return ok({ ok: true, audit: row });
    }
  );

  server.registerTool(
    "icp_score",
    {
      title: "ICP Fit Score",
      description:
        "Compute ICP fit score (0-100) for one or more contacts based on their profession, " +
        "position, country, platform, and contactability. " +
        "Pass contact_id for one, or omit for the top 20 by ICP fit.",
      inputSchema: {
        contact_id: z.string().optional(),
      },
    },
    async ({ contact_id }) => {
      if (contact_id) {
        const c = (await db.select().from(schema.contacts).where(eq(schema.contacts.id, contact_id)).limit(1))[0];
        if (!c) return ok({ error: "Contact not found", contact_id });
        return ok({ contact_id, icp: computeIcpScore(c) });
      }
      const contacts = await db.select().from(schema.contacts);
      const ranked = contacts
        .map((c) => ({ contact: c, icp_score: computeIcpScore(c).score }))
        .sort((a, b) => b.icp_score - a.icp_score)
        .slice(0, 20);
      return ok({ ranked });
    }
  );

  server.registerTool(
    "prep_brief",
    {
      title: "Discovery Call Prep Brief",
      description:
        "Generate a discovery-call prep brief for a specific meeting. Returns: " +
        "meeting metadata, contact details + lead score, recent touchpoints, audits, " +
        "stage-aware discovery questions, common objection responses, and Unicorn's 30-sec pitch. " +
        "Pull this before a call and Claude can polish it into talking points.",
      inputSchema: {
        meeting_id: z.string().describe("ID of the meeting (from upcoming_meetings tool)"),
      },
    },
    async ({ meeting_id }) => {
      const brief = await buildPrepBrief(meeting_id);
      if (!brief) return ok({ error: "Meeting not found", meeting_id });
      return ok(brief);
    }
  );

  server.registerTool(
    "wins_losses",
    {
      title: "Wins & Losses",
      description:
        "Closed deals (Partnership = win, Lost / Closed without Partnership = loss, Not qualified = disqualified) " +
        "with their reasons (when captured). Returns summary stats + per-deal records. Use to find patterns in why deals close.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().default(20),
      },
    },
    async ({ limit }) => {
      const [deals, summary] = await Promise.all([
        listClosedDeals({ limit: limit ?? 20 }),
        winLossSummary(),
      ]);
      return ok({ deals, summary });
    }
  );

  server.registerTool(
    "stuck_deals",
    {
      title: "Stuck Deals",
      description:
        "Contacts that have stalled past their stage's freshness threshold. " +
        "Each item has stage, days stuck, days over threshold, and a suggested next action " +
        "from Saidur's playbook.",
      inputSchema: {},
    },
    async () => {
      const [items, byStage] = await Promise.all([stuckDeals(), stuckByStage()]);
      return ok({ items, by_stage: byStage, total: items.length });
    }
  );

  server.registerTool(
    "sync_gcal",
    {
      title: "Sync Google Calendar",
      description: "Pull latest events from the configured Google Calendar ICS feed.",
      inputSchema: {},
    },
    async () => {
      const result = await syncGoogleCalendar();
      return ok(result);
    }
  );

  // ─────────── WRITE TOOLS ───────────

  server.registerTool(
    "create_activity",
    {
      title: "Create Activity (Draft)",
      description:
        "Write a draft (comment, email, DM, follow-up, note, audit, post observation) to a contact's Activities feed. " +
        "Saidur reviews drafts in /contacts/[id]. Drafts auto-trigger a lead score recompute.",
      inputSchema: {
        contact_id: z.string().describe("Contact id (ULID)"),
        type: z.enum([
          "post_observed",
          "comment_drafted",
          "email_drafted",
          "audit_run",
          "follow_up_sent",
          "dm_sent",
          "note",
        ]),
        content: z.string().min(1).describe("Markdown body of the draft / observation / note"),
        source_url: z.string().optional(),
      },
    },
    async ({ contact_id, type, content, source_url }) => {
      const [row] = await db
        .insert(schema.activities)
        .values({ contactId: contact_id, type, content, sourceUrl: source_url })
        .returning();
      return ok({ ok: true, activity: row });
    }
  );

  server.registerTool(
    "sync_notion",
    {
      title: "Sync Notion",
      description:
        "Trigger a Notion sync. Per-entity to fit Vercel Hobby's 10s function limit. " +
        "Call with entity='contacts' | 'content_items' | 'tracker_entries' to scope. " +
        "Without an entity, runs all three sequentially.",
      inputSchema: {
        entity: z.enum(["contacts", "content_items", "tracker_entries"]).optional(),
      },
    },
    async ({ entity }) => {
      const results = await syncNotion(entity);
      return ok({ ok: true, results });
    }
  );

  // ─────────── AI TOOLS (server-side OpenRouter) ───────────
  // These mirror the .claude/commands/*.md slash commands so Claude.ai (which
  // can only call MCP tools) gets identical output without needing to load the
  // strategy docs / sequence engine itself.

  server.registerTool(
    "next_message",
    {
      title: "Draft Next DM Message",
      description:
        "Server-side equivalent of /next-message. Looks up the contact's current step in the 7-step LinkedIn / 8-step Facebook DM sequence and drafts the next message in ACA voice as Saidur. " +
        "Returns the draft + step metadata (too-soon flag, earliest-send date, target stage). " +
        "Pass save=true to also write the draft to the contact's activities feed as a 'dm_sent' entry. " +
        "Uses OpenRouter (free tier) — no Claude Code needed.",
      inputSchema: {
        contact_id: z.string().describe("Contact ULID"),
        save: z.boolean().optional().default(false).describe("If true, save the draft as a dm_sent activity"),
      },
    },
    async ({ contact_id, save }) => {
      const result = await generateNextMessage({ contactId: contact_id, save: save ?? false });
      if (!result) return ok({ error: "OPENROUTER_API_KEY not set or contact not found", contact_id });
      return ok(result);
    }
  );

  server.registerTool(
    "stuck_suggestion",
    {
      title: "AI Suggestion for Stuck Contact",
      description:
        "One-sentence next-action suggestion for a stuck contact. Reads recent activities + stage. " +
        "Uses OpenRouter (free tier), cached 24h per contact.",
      inputSchema: {
        contact_id: z.string().describe("Contact ULID"),
      },
    },
    async ({ contact_id }) => {
      const result = await getStuckSuggestion(contact_id);
      if (!result) return ok({ error: "OPENROUTER_API_KEY not set or contact not found", contact_id });
      return ok(result);
    }
  );

  server.registerTool(
    "daily_summary",
    {
      title: "AI Daily Briefing",
      description:
        "3-bullet morning briefing of yesterday's activity. Cached 24h. " +
        "Server-side equivalent of part of /run-daily — narrative section only.",
      inputSchema: {},
    },
    async () => {
      const result = await getDailySummary();
      if (!result) return ok({ error: "OPENROUTER_API_KEY not set" });
      return ok(result);
    }
  );

  server.registerTool(
    "history",
    {
      title: "Global History",
      description:
        "Unified chronological event stream from across the tool: drafted/sent activities, " +
        "meetings, audits, tracker entries, sync events, and content-publish flips. " +
        "Filter by type, date range, contact. Default: last 30 days, all types, up to 200 events.",
      inputSchema: {
        days: z.number().int().min(1).max(365).optional().default(30),
        types: z.array(z.enum(["activity", "meeting", "audit", "tracker", "sync", "content_published"])).optional(),
        contact_id: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional().default(200),
      },
    },
    async ({ days, types, contact_id, limit }) => {
      const since = new Date(Date.now() - (days ?? 30) * 24 * 60 * 60 * 1000);
      const events = await getHistory({
        since,
        types: types as HistoryEventType[] | undefined,
        contactId: contact_id,
        limit,
      });
      return ok({ count: events.length, events });
    }
  );

  server.registerTool(
    "comment_draft",
    {
      title: "Draft Comment for Prospect's Post",
      description:
        "Drafts an ACA comment on a prospect's social post in Saidur's voice. " +
        "Provide either postText (paste the post body) OR postUrl. Optionally " +
        "pass contact_id so the LLM knows who you're addressing. " +
        "Use when Taplio/Tweethunter isn't available or you want a quick draft.",
      inputSchema: {
        postText: z.string().optional().describe("The post body text. Preferred over postUrl when available."),
        postUrl: z.string().optional().describe("URL of the post (used as fallback if no text)"),
        contact_id: z.string().optional().describe("Contact ULID — adds the prospect's profile context"),
        extraContext: z.string().optional().describe("Optional one-liner of extra context (e.g., 'they just raised seed')"),
      },
    },
    async ({ postText, postUrl, contact_id, extraContext }) => {
      const result = await draftComment({ postText, postUrl, contactId: contact_id, extraContext });
      if (!result) return ok({ error: "OPENROUTER_API_KEY not set or no post content provided" });
      return ok(result);
    }
  );

  server.registerTool(
    "classify_icp",
    {
      title: "Classify Contact ICP Fit",
      description:
        "LLM-classifies a contact against Unicorn Studio's ICP (AI SaaS founders / B2B SMBs needing AI automation). " +
        "Returns a short tag (Hot/Warm/Cold/Not ICP + one-line reason) and saves it to the contact row.",
      inputSchema: {
        contact_id: z.string().describe("Contact ULID"),
      },
    },
    async ({ contact_id }) => {
      const result = await classifyContact(contact_id);
      if (!result) return ok({ error: "OPENROUTER_API_KEY not set or contact not found", contact_id });
      return ok(result);
    }
  );

  // ────────────────────────────────────────────────────────────────────────
  // NETWORKING (PRM) — message-drafting workflow for Claude UI
  // ────────────────────────────────────────────────────────────────────────
  // These tools let Claude (in the chat UI, using the user's subscription)
  // pull next-touch context from the PRM, draft the message inline, and save
  // the three variants back to networking_messages. The app then displays
  // the drafts on /networking/[id] for review + send.

  server.registerTool(
    "networking_next_drafts",
    {
      title: "Networking · Next Drafts Queue",
      description:
        "Cadence-style queue: which networking (PRM) contacts to message NEXT, ordered by " +
        "priority — overdue follow-ups first, then due-today, then going-cold (30d+), then " +
        "never-messaged. Returns id + name + reason + days since last contact. Use this to pick " +
        "who to draft for, then call networking_message_context for the chosen id.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().default(15),
      },
    },
    async ({ limit }) => {
      const q = await getNetworkingNextDrafts(limit ?? 15);
      return ok({
        totals: q.totals,
        items: q.items.map((i) => ({
          id: i.contact.id,
          name: i.contact.name,
          relationship: i.contact.relationship,
          stage: i.contact.stage,
          platform: i.contact.platform,
          reason: i.reason,
          priority: i.priority,
          days_since_contact: i.daysSinceContact,
          days_until_follow_up: i.daysUntilFollowUp,
          has_drafted_before: i.hasDraftedBefore,
          notion_url: i.notionUrl,
        })),
      });
    }
  );

  server.registerTool(
    "networking_message_context",
    {
      title: "Networking · Message Context for Drafting",
      description:
        "Returns everything needed to draft a message to a networking contact: full PRM profile " +
        "(role, position, company, location, interests, notes, recent post), last message sent to " +
        "them (if any), and the framework guides Claude can pick from. After Claude generates the " +
        "3 variants (short/standard/detailed), call save_networking_draft to persist them.",
      inputSchema: {
        contact_id: z.string().describe("Networking contact id (ULID)"),
      },
    },
    async ({ contact_id }) => {
      const contact = await getNetworkingContact(contact_id);
      if (!contact) return ok({ error: "Contact not found", contact_id });

      const lastMsg = await getLastMessageForContact(contact_id);
      const messages = await getMessagesForContact(contact_id);
      const interests = parseJson<string[]>(contact.interests, []);
      const tags = parseJson<string[]>(contact.tags, []);

      // Pick the chosen variant of the last message (or fall back to standard)
      let lastMessageBody: string | null = null;
      if (lastMsg) {
        const chosen = lastMsg.chosenVariant ?? "standard";
        lastMessageBody =
          (chosen === "short" && lastMsg.generatedShort) ||
          (chosen === "detailed" && lastMsg.generatedDetailed) ||
          lastMsg.generatedStandard ||
          null;
      }

      return ok({
        contact: {
          id: contact.id,
          name: contact.name,
          relationship: contact.relationship,
          role: contact.role,
          position: contact.position,
          company: contact.company,
          profession: contact.profession,
          location: contact.location,
          platform: contact.platform,
          stage: contact.stage,
          source: contact.source,
          email: contact.email,
          phone: contact.phone,
          profile_url: contact.profileUrl,
          interests,
          tags,
          notes: contact.notes,
          recent_post: contact.recentPost,
          recent_post_url: contact.recentPostUrl,
          last_contact_at: contact.lastContactAt?.toISOString().slice(0, 10) ?? null,
          next_follow_up_at: contact.nextFollowUpAt?.toISOString().slice(0, 10) ?? null,
        },
        last_message_to_this_contact: lastMessageBody,
        previous_drafts_count: messages.length,
        framework_options: FRAMEWORKS.map((f) => ({ id: f.id, label: f.label, when: f.help })),
        sender: { name: "Saidur Rahaman", org: "Unicorn Studio" },
        instructions:
          "Draft 3 variants (short ~25-45 words, standard ~60-100, detailed ~120-200) sharing the same " +
          "intent + ask, differing only in length. Personalize: use their name and any specific detail " +
          "from their profile / recent post. If recent_post is set, quote or reference one sharp detail " +
          "from it — don't paraphrase the whole post. Tone should match the relationship. " +
          "Then call save_networking_draft with all three variants.",
      });
    }
  );

  server.registerTool(
    "save_networking_draft",
    {
      title: "Networking · Save Drafted Message",
      description:
        "Persist a Claude-drafted networking message (3 variants) to the app. Appears in the " +
        "contact's Message History feed on /networking/[id]. Status defaults to 'draft' — the " +
        "user reviews + sends from their actual social media, then can call mark_networking_message_sent.",
      inputSchema: {
        contact_id: z.string().describe("Networking contact id"),
        short: z.string().describe("Short variant, ~25-45 words"),
        standard: z.string().describe("Standard variant, ~60-100 words"),
        detailed: z.string().describe("Detailed variant, ~120-200 words"),
        framework: z.string().optional().describe("ACA, AIDA, PAS, FAB, BAB, QUEST, or Casual"),
        tone: z.string().optional().describe("e.g. Friendly, Professional, Direct, Casual"),
        channel: z.string().optional().describe("DM / Inbox, Email, WhatsApp, etc."),
        language: z.string().optional().describe("English / Bengali / Other"),
        purpose: z.string().optional().describe("Why you're reaching out"),
        topic: z.string().optional().describe("Subject / one-liner for this message"),
        context_chips: z.array(z.string()).optional().describe("Up to 3 context tags"),
        cta_chips: z.array(z.string()).optional().describe("Up to 3 call-to-action chips"),
        recent_post_used: z.string().optional().describe("The recent post you grounded the message in (for record-keeping)"),
      },
    },
    async (args) => {
      const contact = await getNetworkingContact(args.contact_id);
      if (!contact) return ok({ error: "Contact not found", contact_id: args.contact_id });

      const saved = await createMessage({
        contactId: args.contact_id,
        purpose: args.purpose ?? null,
        contextChips: args.context_chips && args.context_chips.length > 0 ? JSON.stringify(args.context_chips.slice(0, 3)) : null,
        contextDetail: args.recent_post_used ?? null,
        ctaChips: args.cta_chips && args.cta_chips.length > 0 ? JSON.stringify(args.cta_chips.slice(0, 3)) : null,
        tone: args.tone ?? null,
        framework: args.framework ?? null,
        channel: args.channel ?? null,
        language: args.language ?? "English",
        topic: args.topic ?? null,
        generatedShort: args.short,
        generatedStandard: args.standard,
        generatedDetailed: args.detailed,
        status: "draft",
      });
      return ok({
        ok: true,
        message_id: saved.id,
        contact_id: args.contact_id,
        contact_name: contact.name,
        view_url: `/networking/${args.contact_id}`,
      });
    }
  );

  server.registerTool(
    "mark_networking_message_sent",
    {
      title: "Networking · Mark Drafted Message as Sent",
      description:
        "Mark a drafted message as actually sent (after you copy it into LinkedIn / X / Email). " +
        "Optionally records which variant you used.",
      inputSchema: {
        message_id: z.string().describe("Message id returned by save_networking_draft"),
        chosen_variant: z.enum(["short", "standard", "detailed"]).optional(),
      },
    },
    async ({ message_id, chosen_variant }) => {
      const updated = await updateMessage(message_id, {
        status: "sent",
        sentAt: new Date(),
        chosenVariant: chosen_variant ?? null,
      });
      if (!updated) return ok({ error: "Message not found", message_id });
      return ok({ ok: true, message_id, status: "sent", chosen_variant: chosen_variant ?? null });
    }
  );

  server.registerTool(
    "list_networking_contacts",
    {
      title: "Networking · List Contacts",
      description: "List PRM contacts with optional search, stage, or relationship filter. Sorted most-recent first.",
      inputSchema: {
        search: z.string().optional().describe("Substring match on name / company / profession"),
        stage: z.string().optional(),
        relationship: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().default(30),
      },
    },
    async (args) => {
      const rows = await listNetworkingContacts({
        search: args.search,
        stage: args.stage,
        relationship: args.relationship,
        limit: args.limit ?? 30,
      });
      return ok({
        count: rows.length,
        contacts: rows.map((c) => ({
          id: c.id,
          name: c.name,
          relationship: c.relationship,
          role: c.role,
          position: c.position,
          company: c.company,
          stage: c.stage,
          platform: c.platform,
          last_contact_at: c.lastContactAt?.toISOString().slice(0, 10) ?? null,
        })),
      });
    }
  );

  server.registerTool(
    "get_networking_contact",
    {
      title: "Networking · Get Contact + Message History",
      description: "Full PRM record for one contact + every draft + sent message tied to them.",
      inputSchema: {
        contact_id: z.string(),
      },
    },
    async ({ contact_id }) => {
      const contact = await getNetworkingContact(contact_id);
      if (!contact) return ok({ error: "Contact not found", contact_id });
      const messages = await getMessagesForContact(contact_id);
      return ok({ contact, messages });
    }
  );

  server.registerTool(
    "networking_analytics",
    {
      title: "Networking · Analytics Snapshot",
      description:
        "Full analytics rollup for the networking PRM: headline KPIs (total, +30d new, " +
        "overdue follow-ups, due this week, going cold, cold, total drafts, drafts in 30d), " +
        "distributions by stage / relationship / platform / contact freshness, " +
        "14-day message-drafting activity, most-used frameworks + tones, upcoming follow-ups, " +
        "and oldest-untouched contacts. Mirrors what /networking shows.",
      inputSchema: {},
    },
    async () => {
      const data = await getNetworkingAnalytics();
      return ok(data);
    }
  );

  // ────────────────────────────────────────────────────────────────────────
  // CLIENTS — Sales CRM contacts whose Status reached "Partnership"
  // ────────────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_clients",
    {
      title: "Clients · List Active Partnerships",
      description:
        "List all Partnership-stage contacts with health tracking. Each client includes " +
        "days as client (since statusDate), days since last touch, and a health bucket " +
        "(fresh ≤14d, warm ≤30d, cooling ≤90d, cold 90d+, unknown if never touched). " +
        "Returns aggregate totals too. Use to find clients going quiet that need a check-in.",
      inputSchema: {
        search: z.string().optional().describe("Optional substring search on client name"),
      },
    },
    async ({ search }) => {
      const view = await getClientsView(search);
      return ok({
        totals: view.totals,
        items: view.items.map((i) => ({
          id: i.contact.id,
          name: i.contact.name,
          status: i.contact.status,
          platform: i.contact.platform,
          country: i.contact.country,
          days_as_client: i.daysAsClient,
          days_since_touch: i.daysSinceTouch,
          health: i.health,
          notion_url: i.notionUrl,
          follow_up_date: i.contact.followUpDate?.toISOString().slice(0, 10) ?? null,
        })),
      });
    }
  );

  // ────────────────────────────────────────────────────────────────────────
  // OUTREACH LIMITS — read + edit per-(platform, action) safety caps
  // ────────────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_outreach_limits",
    {
      title: "Outreach · Get Daily + Hourly Limits Config",
      description:
        "Returns the current outreach safety config: active window (start/end hour) and " +
        "the full per-(platform, action) max + per-hour values, including any user overrides " +
        "saved in /settings. Use to inspect what's allowed before recommending volume.",
      inputSchema: {},
    },
    async () => {
      const cfg = await getOutreachConfig();
      // Return both the saved overrides AND the resolved values per platform/action
      // so Claude can answer questions like "what's my LinkedIn DM cap" without
      // having to recompute defaults.
      const resolved: Record<string, Record<string, { max: number; perHour: number; label: string }>> = {};
      for (const [pk, pcfg] of Object.entries(PLATFORM_LIMITS) as [PlatformKey, any][]) {
        const platformOverride = (cfg.overrides[pk] ?? {}) as Record<string, any>;
        resolved[pk] = {};
        for (const [ak, acfg] of Object.entries(pcfg.actions) as [ActionKey, any][]) {
          const ov = platformOverride[ak] ?? {};
          resolved[pk][ak] = {
            max: ov.max ?? acfg.max,
            perHour: ov.perHour ?? acfg.perHour,
            label: acfg.label,
          };
        }
      }
      return ok({ active_window: cfg.activeWindow, saved_overrides: cfg.overrides, resolved_limits: resolved });
    }
  );

  server.registerTool(
    "set_outreach_limit",
    {
      title: "Outreach · Set One Daily-Cap Override",
      description:
        "Override max and/or perHour for one (platform, action) combination. Persists to " +
        "app_settings and revalidates the affected pages so /connect, /dm, /engage, and " +
        "/daily-sales reflect immediately. Pass null/omit a field to leave it at default.",
      inputSchema: {
        platform: z.enum(["linkedin", "x", "instagram", "facebook", "reddit", "discord", "whatsapp", "slack", "email"]),
        action: z.enum(["dm", "connect", "comment", "follow_up", "inmail"]),
        max: z.number().int().min(1).max(10000).optional().describe("Daily max for this action. Omit to leave at default."),
        perHour: z.number().int().min(1).max(500).optional().describe("Hourly pacing budget. Omit to leave at default."),
      },
    },
    async ({ platform, action, max, perHour }) => {
      const cfg = await getOutreachConfig();
      const overrides = { ...cfg.overrides } as Record<string, Record<string, { max?: number; perHour?: number }>>;
      if (!overrides[platform]) overrides[platform] = {};
      const cur = overrides[platform][action] ?? {};
      const next: { max?: number; perHour?: number } = { ...cur };
      if (max !== undefined) next.max = max;
      if (perHour !== undefined) next.perHour = perHour;
      // If both fields are absent (caller wants to reset), drop the override entirely
      if (next.max === undefined && next.perHour === undefined) {
        delete overrides[platform][action];
        if (Object.keys(overrides[platform]).length === 0) delete overrides[platform];
      } else {
        overrides[platform][action] = next;
      }
      const newCfg: OutreachConfig = { activeWindow: cfg.activeWindow, overrides };
      await saveOutreachConfig(newCfg);
      return ok({
        ok: true,
        platform,
        action,
        applied: next,
        note: "Refresh /connect, /dm, /engage, /daily-sales to see the new targets.",
      });
    }
  );

  // ────────────────────────────────────────────────────────────────────────
  // PROFILE PARSE — extract structured contact data from a social profile
  // ────────────────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────────────────
  // USERS — read-only view of workspace users + roles. Mutations live in
  // the web /admin/users panel since the MCP endpoint isn't per-user authed.
  // ────────────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_users",
    {
      title: "Users · List Workspace Members",
      description:
        "Workspace users + their roles. Each user has: id, email, name, " +
        "role (owner/admin/salesperson/viewer), active flag, last login. " +
        "Use to see who owns leads (cross-reference with the Person column on " +
        "contacts) or to answer 'who's on the team'. Read-only — to change a " +
        "role, deactivate, or delete, use /admin/users in the web app.",
      inputSchema: {},
    },
    async () => {
      const users = await listUsers();
      return ok({
        count: users.length,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          active: !!u.active,
          created_at: u.createdAt?.toISOString() ?? null,
          last_login_at: u.lastLoginAt?.toISOString() ?? null,
        })),
      });
    }
  );

  server.registerTool(
    "parse_social_profile",
    {
      title: "Profile Parse · Image / Text / URL → Structured",
      description:
        "Extract a contact's name, role, position, company, location, bio, recent post, " +
        "skills, and interests from a social media profile. Three input modes: " +
        "image (data URL or https URL — vision LLM OCRs), text (pasted profile content), " +
        "or url (server-side fetch — LinkedIn/X/IG/FB block server fetches, use image/text " +
        "for those). Output feeds the Write Message wizard's recipient grounding.",
      inputSchema: {
        mode: z.enum(["image", "text", "url"]),
        payload: z.string().describe(
          "image: data URL like 'data:image/png;base64,...' or an https image URL; " +
          "text: copy-pasted profile content; " +
          "url: a public web URL (blogs / About pages work; major social sites blocked)"
        ),
      },
    },
    async ({ mode, payload }) => {
      try {
        let parsed;
        if (mode === "image") parsed = await parseProfileFromImage(payload);
        else if (mode === "text") parsed = await parseProfileFromText(payload);
        else parsed = await parseProfileFromUrl(payload);
        return ok({ ok: true, parsed });
      } catch (e: any) {
        return ok({ ok: false, error: e?.message ?? String(e) });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────
  // MARKET OR DIE — weekly marketing leaderboard (read-only)
  // ────────────────────────────────────────────────────────────────────────

  server.registerTool(
    "marketing_leaderboard",
    {
      title: "Market or Die · Weekly Leaderboard",
      description:
        "Read the team's weekly marketing leaderboard. Returns one row per active user " +
        "with rank, level (L1–L4 based on lifetime points), this-week points vs target, " +
        "percent of target, hit/miss flag, current streak (consecutive prior weeks they " +
        "hit target, capped at 26), and activity count. Sorted by week points desc. " +
        "Pass weekStart=YYYY-MM-DD (UTC Monday) to read a past or future week; omit for the current week.",
      inputSchema: {
        weekStart: z
          .string()
          .optional()
          .describe("UTC Monday YYYY-MM-DD. Omit for this week."),
      },
    },
    async ({ weekStart }) => {
      const ws = weekStart || weekStartFor();
      const { rows } = await getLeaderboard(ws);
      return ok({
        weekStart: ws,
        weekLabel: fmtWeekLabel(ws),
        teamTotals: {
          activeUsers: rows.length,
          totalWeekPoints: rows.reduce((s, r) => s + r.weekPoints, 0),
          hitTargetCount: rows.filter((r) => r.hitTarget).length,
          topStreak: Math.max(0, ...rows.map((r) => r.streakWeeks)),
        },
        rows: rows.map((r) => ({
          rank: r.rank,
          userId: r.userId,
          name: r.name,
          email: r.email,
          role: r.role,
          level: r.level,
          weekPoints: r.weekPoints,
          targetPoints: r.targetPoints,
          pct: r.pct,
          hitTarget: r.hitTarget,
          streakWeeks: r.streakWeeks,
          activityCount: r.activityCount,
          lifetimePoints: r.lifetimePoints,
        })),
      });
    }
  );

  return server;
}
