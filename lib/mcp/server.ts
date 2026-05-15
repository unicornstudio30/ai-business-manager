// MCP server definition — exposes Unicorn Studio's web app as tools for Claude.
// Reuses all existing query/mutation code; doesn't duplicate logic.
//
//   READ: briefing, list_contacts, get_contact, hot_leads, needs_follow_up,
//         engagement_queue, cadences_due, icp_score, analytics, inbox,
//         stuck_deals, wins_losses, prep_brief, upcoming_meetings,
//         stage_definitions
//   WRITE: create_activity, sync_notion, sync_gcal, save_audit

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

  return server;
}
