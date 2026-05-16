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
import { nextMeetings } from "@/lib/db/meetings";
import { inboxView, inboxCounts } from "@/lib/db/inbox-view";
import { stuckDeals } from "@/lib/db/stuck-deals";
import { NextMeetings } from "@/components/dashboard/next-meetings";
import { InboxWidget } from "@/components/dashboard/inbox-widget";
import { StuckWidget } from "@/components/dashboard/stuck-widget";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { TodayQueue } from "@/components/dashboard/today-queue";
import { db, schema } from "@/lib/db/client";
import { syncStatus } from "@/lib/notion/sync";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, groups, hot, followUps, sync, funnel, trend, meetings, contacts, inbox, inboxC, stuck] = await Promise.all([
    getDashboardStats(),
    getStageGroupCounts(),
    getHotLeads(6),
    getNeedsFollowUp(11, 6),
    syncStatus(),
    funnelCounts(),
    activityTrend30d(),
    nextMeetings(3),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
    inboxView(),
    inboxCounts(),
    stuckDeals(),
  ]);
  const contactName = new Map(contacts.map((c) => [c.id, c.name]));

  const notConfigured = !sync.configured;

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

      <TodayQueue />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total contacts" value={stats.totalContacts} />
        <StatCard label="Hot leads" value={stats.hotLeads} tone="red" />
        <StatCard label="Active clients" value={stats.activeClients} tone="green" />
        <StatCard label="Need follow-up" value={stats.needFollowUp} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <InboxWidget items={inbox} total={inboxC.total} byChannel={inboxC.byChannel} />
        <StuckWidget items={stuck} />
        <NextMeetings meetings={meetings} contactName={contactName} />
      </div>

      <FunnelChart data={funnel} />

      <ActivityTrend data={trend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StageBreakdown groups={groups} />
        <HotLeadsList contacts={hot} />
      </div>

      <FollowUpList contacts={followUps} />
    </div>
  );
}
