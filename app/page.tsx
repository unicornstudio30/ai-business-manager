import { StatCard } from "@/components/dashboard/stat-card";
import { StageBreakdown } from "@/components/dashboard/stage-breakdown";
import { HotLeadsList } from "@/components/dashboard/hot-leads-list";
import { FollowUpList } from "@/components/dashboard/follow-up-list";
import {
  getDashboardStats,
  getHotLeads,
  getNeedsFollowUp,
  getStageGroupCounts,
} from "@/lib/db/queries";
import { syncStatus } from "@/lib/notion/sync";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, groups, hot, followUps, sync] = await Promise.all([
    getDashboardStats(),
    getStageGroupCounts(),
    getHotLeads(6),
    getNeedsFollowUp(11, 6),
    syncStatus(),
  ]);

  const notConfigured = !sync.configured;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          {stats.totalContacts === 0 ? "Welcome to Unicorn Studio's CRM." : "I'm fully in! Here's a live summary of your CRM:"}
        </h1>
        {notConfigured && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-medium mb-1">Notion not connected yet</div>
            <div className="text-amber-800">
              Add <code className="px-1 bg-amber-100 rounded">NOTION_TOKEN</code> to <code className="px-1 bg-amber-100 rounded">.env.local</code> and share the 3 Unicorn databases with your integration. See README for the 5-minute setup.
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total contacts" value={stats.totalContacts} />
        <StatCard label="Hot leads" value={stats.hotLeads} tone="red" />
        <StatCard label="Active clients" value={stats.activeClients} tone="green" />
        <StatCard label="Need follow-up" value={stats.needFollowUp} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StageBreakdown groups={groups} />
        <HotLeadsList contacts={hot} />
      </div>

      <FollowUpList contacts={followUps} />
    </div>
  );
}
