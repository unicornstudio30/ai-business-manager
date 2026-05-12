import { listEngagementQueue, getTodayCounts, DAILY_TARGETS } from "@/lib/db/engagement";
import { EngagementRow } from "@/components/engagement/engagement-row";
import { DailyProgress } from "@/components/engagement/daily-progress";

export const dynamic = "force-dynamic";

export default async function EngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  const onlyHot = sp.scope !== "all";

  const [queue, counts] = await Promise.all([
    listEngagementQueue({ onlyHot, limit: 100 }),
    getTodayCounts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Engagement &amp; Outreach</h1>
        <p className="text-sm text-stone-500 mt-1">
          Daily queue ranked by lead score. AI buttons copy a slash command — paste in Claude Code.
        </p>
      </div>

      <DailyProgress counts={counts} targets={DAILY_TARGETS} />

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
    </div>
  );
}
