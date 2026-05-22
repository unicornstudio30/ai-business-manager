import { listEngagementQueue, getTodayCounts, DAILY_TARGETS } from "@/lib/db/engagement";
import { getEngagementByPlatform } from "@/lib/db/engagement-by-platform";
import { EngagementRow } from "@/components/engagement/engagement-row";
import { DailyProgress } from "@/components/engagement/daily-progress";
import { PlatformEngagementSection } from "@/components/engagement/platform-engagement";

export const dynamic = "force-dynamic";

export default async function EngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  const onlyHot = sp.scope !== "all";

  const [queue, counts, byPlatform] = await Promise.all([
    listEngagementQueue({ onlyHot, limit: 100 }),
    getTodayCounts(),
    getEngagementByPlatform(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Daily outreach</div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Engagement &amp; Outreach</h1>
        <p className="text-sm text-stone-500 mt-1">
          Daily queue ranked by ICP fit + per-platform engagement levels derived from Notion CRM.
        </p>
      </div>

      <DailyProgress counts={counts} targets={DAILY_TARGETS} />

      {/* Per-platform engagement breakdown with CSV downloads */}
      <PlatformEngagementSection data={byPlatform} />

      {/* Existing queue */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-stone-900">Daily queue</h2>
          <div className="flex items-center gap-2">
            <a
              href="/engagement"
              className={`text-sm rounded-md px-3 py-1.5 ${onlyHot ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              Hot leads only ({onlyHot ? queue.length : "—"})
            </a>
            <a
              href="/engagement?scope=all"
              className={`text-sm rounded-md px-3 py-1.5 ${!onlyHot ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              All contacts ({!onlyHot ? queue.length : "—"})
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
              No contacts match. Try switching to "All contacts" or add prospects in Notion.
            </div>
          ) : (
            queue.map(({ contact, score, lastActivity }) => (
              <EngagementRow
                key={contact.id}
                id={contact.id}
                name={contact.name}
                stage={contact.status}
                status={contact.status}
                platform={contact.platform}
                remarks={contact.remarks}
                contactUrl={contact.contactUrl}
                notionPageId={contact.notionPageId}
                score={score}
                lastActivity={lastActivity}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
