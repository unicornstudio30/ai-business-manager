import { StatCard } from "@/components/dashboard/stat-card";
import { StageBreakdown } from "@/components/dashboard/stage-breakdown";
import { HotLeadsList } from "@/components/dashboard/hot-leads-list";
import { FollowUpList } from "@/components/dashboard/follow-up-list";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ActivityTrend } from "@/components/dashboard/activity-trend";
import {
  getDashboardStats,
  getHotLeads,
  getNeedsFollowUp,
  getStageGroupCounts,
} from "@/lib/db/queries";
import { funnelCounts, activityTrend30d } from "@/lib/db/analytics";
import { nextMeetings, upcomingMeetings } from "@/lib/db/meetings";
import { inboxView, inboxCounts } from "@/lib/db/inbox-view";
import { stuckDeals } from "@/lib/db/stuck-deals";
import { NextMeetings } from "@/components/dashboard/next-meetings";
import { InboxWidget } from "@/components/dashboard/inbox-widget";
import { ConnectWidget } from "@/components/dashboard/connect-widget";
import { EngagementWidget } from "@/components/dashboard/engagement-widget";
import { StuckWidget } from "@/components/dashboard/stuck-widget";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { TodayQueue } from "@/components/dashboard/today-queue";
import { StreakHero } from "@/components/daily-sales/streak-hero";
import { getStreak } from "@/lib/db/streak";
import { db, schema } from "@/lib/db/client";
import { syncStatus } from "@/lib/notion/sync";
import { getNotionDerivedKpis } from "@/lib/db/notion-derived-kpis";
import { getEngagementQueueByPlatform } from "@/lib/db/engagement-queue";
import { getConnectQueueByPlatform } from "@/lib/db/connect-queue";
import { getEffectiveOutreachLimits } from "@/lib/outreach-config";
import { PLATFORM_LIMITS, PLATFORMS_ORDER, target, type PlatformKey } from "@/lib/sales-limits";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, groups, hot, followUps, sync, funnel, trend, meetings, allUpcomingMeetings, contacts, inbox, inboxC, stuck, streak, kpis, engagementQueue, connectQueue, effective] = await Promise.all([
    getDashboardStats(),
    getStageGroupCounts(),
    getHotLeads(6),
    getNeedsFollowUp(11, 6),
    syncStatus(),
    funnelCounts(),
    activityTrend30d(),
    nextMeetings(3),
    upcomingMeetings(200),                     // for total count in row-1 stat card
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
    inboxView(),
    inboxCounts(),
    stuckDeals(),
    getStreak(),
    getNotionDerivedKpis(new Date()),
    getEngagementQueueByPlatform(),
    getConnectQueueByPlatform(),
    getEffectiveOutreachLimits(),
  ]);
  const contactName = new Map(contacts.map((c) => [c.id, c.name]));

  const notConfigured = !sync.configured;

  // Daily target totals for the Connect / Engage / DM progress cards in row 2.
  // Connect targets cover the four "social" platforms with a connect action
  // (LinkedIn, X, Instagram, Facebook). DM totals include dm + inmail +
  // follow-up across every messaging platform. Engage targets are derived from
  // commentTarget(p) = floor(dm.max * 0.4) for the comment-active platforms.
  const ENGAGE_PLATFORMS: PlatformKey[] = ["linkedin", "x", "instagram", "facebook", "reddit"];
  let connectTarget = 0;
  let dmTarget = 0;
  let engageTarget = 0;
  for (const p of PLATFORMS_ORDER) {
    const cfg = (effective.limits[p]?.actions ?? PLATFORM_LIMITS[p].actions) as any;
    if (cfg.connect?.max) connectTarget += target(p, "connect", false, effective.limits);
    if (cfg.dm?.max) dmTarget += target(p, "dm", false, effective.limits);
    if (cfg.inmail?.max) dmTarget += target(p, "inmail", false, effective.limits);
    if (cfg.follow_up?.max) dmTarget += target(p, "follow_up", false, effective.limits);
  }
  for (const p of ENGAGE_PLATFORMS) {
    const dmMax = (effective.limits[p]?.actions?.dm?.max ?? (PLATFORM_LIMITS[p].actions as any).dm?.max ?? 0);
    engageTarget += Math.floor(dmMax * 0.4);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Dashboard</div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          {stats.totalContacts === 0 ? "Welcome to Unicorn Studio." : "Good morning, Saidur."}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {stats.totalContacts === 0
            ? "Connect Notion to see your CRM here."
            : `${stats.totalContacts} contacts · ${stats.hotLeads} hot · ${stats.needFollowUp} need follow-up`}
        </p>
        {notConfigured && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-elevation-1">
            <div className="font-medium mb-1">Notion not connected yet</div>
            <div className="text-amber-800">
              Add <code className="px-1 bg-amber-100 rounded">NOTION_TOKEN</code> to <code className="px-1 bg-amber-100 rounded">.env.local</code> and share the 3 Unicorn databases with your integration.
            </div>
          </div>
        )}
      </div>

      <DailySummary />

      <StreakHero streak={streak} />

      <TodayQueue />

      {/* Row 1 — pipeline + commitments at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Leads" value={stats.hotLeads} tone="red" />
        <StatCard label="Follow-up" value={stats.needFollowUp} tone="amber" />
        <StatCard label="Meetings" value={allUpcomingMeetings.length} />
        <StatCard label="Active Clients" value={stats.activeClients} tone="green" />
        <StatCard label="Stuck deals" value={stuck.length} tone="amber" />
      </div>

      {/* Row 2 — Leads + Follow-up lists. These are the "who specifically"
          counterparts to the Leads / Follow-up tiles in row 1. Pulled up here
          so you see the actual names before the outreach pillars. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HotLeadsList contacts={hot} />
        <FollowUpList contacts={followUps} />
      </div>

      {/* Row 3 — Connect / Engage / DM. Each card = today's progress + the next
          contacts to action. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ConnectWidget kpis={kpis} queue={connectQueue} target={connectTarget} />
        <EngagementWidget kpis={kpis} queue={engagementQueue} target={engageTarget} />
        <InboxWidget
          items={inbox}
          total={inboxC.total}
          byChannel={inboxC.byChannel}
          kpis={kpis}
          target={dmTarget}
        />
      </div>

      {/* Row 4 — ops / health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StuckWidget items={stuck} />
        <NextMeetings meetings={meetings} contactName={contactName} />
      </div>

      <FunnelChart data={funnel} />

      <ActivityTrend data={trend} />

      <StageBreakdown groups={groups} />
    </div>
  );
}
