// /engagement — purely the daily engagement (commenting) workflow.
// DMs, follow-ups, and inbox now live under /dm.
//
// Three blocks:
//   1. EngagementReminders   — today's engagement targets per platform
//   2. EngagementQueuePlatform — who to comment on TODAY, grouped by platform,
//      with profile links + Notion edit links + per-platform CSV downloads
//   3. PlatformEngagementSection — long-term engagement health per platform
//      (highly engaged / touched / cold)

import { getNotionDerivedKpis } from "@/lib/db/notion-derived-kpis";
import { getEngagementByPlatform } from "@/lib/db/engagement-by-platform";
import { getEngagementQueueByPlatform } from "@/lib/db/engagement-queue";
import { getEffectiveOutreachLimits } from "@/lib/outreach-config";
import { EngagementReminders } from "@/components/engagement/engagement-reminders";
import { EngagementQueuePlatform } from "@/components/engagement/engagement-queue-platform";
import { PlatformEngagementSection } from "@/components/engagement/platform-engagement";

export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const today = new Date();

  const [kpis, queue, byPlatform, effective] = await Promise.all([
    getNotionDerivedKpis(today),
    getEngagementQueueByPlatform(),
    getEngagementByPlatform(),
    getEffectiveOutreachLimits(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
          Comment on prospects · earn the conversation
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Engagement</h1>
        <p className="text-sm text-stone-500 mt-1">
          Daily commenting workflow. DMs and follow-ups live under{" "}
          <a href="/dm" className="text-violet-700 hover:underline">DM</a>.
        </p>
      </div>

      {/* 1. Daily engagement targets + per-platform progress */}
      <EngagementReminders kpis={kpis} limits={effective.limits} activeWindow={effective.activeWindow} />

      {/* 2. Today's prioritized queue by platform with profile/Notion links + CSV */}
      <EngagementQueuePlatform data={queue} />

      {/* 3. Long-term engagement health (touched/cold) */}
      <PlatformEngagementSection data={byPlatform} />
    </div>
  );
}
