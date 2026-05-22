import Link from "next/link";
import {
  get7DaysOfKpis,
  platformBreakdownForDate,
  platformBreakdown7Days,
} from "@/lib/db/daily-kpis";
import { getStreak } from "@/lib/db/streak";
import { getNotionDerivedKpis } from "@/lib/db/notion-derived-kpis";
import { StreakHero } from "@/components/daily-sales/streak-hero";
import { PlatformCapsPanel } from "@/components/daily-sales/platform-caps";
import { WinAnalysisPanel } from "@/components/daily-sales/win-analysis";
import { Platform7DayGrid } from "@/components/daily-sales/platform-7day-grid";
import { DerivedKpisPanel } from "@/components/daily-sales/derived-kpis-panel";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const KPI_FIELDS: Array<{ key: string; label: string; emoji: string }> = [
  { key: "coldDmsSent", label: "Cold DM", emoji: "📨" },
  { key: "coldEmailsSent", label: "Email", emoji: "✉️" },
  { key: "followUpsSent", label: "F/up", emoji: "↩️" },
  { key: "warmDmsSent", label: "Warm", emoji: "🔥" },
  { key: "commentsOnProspects", label: "Comm", emoji: "💬" },
  { key: "responses", label: "Reply", emoji: "✅" },
  { key: "callsBooked", label: "Call", emoji: "📞" },
  { key: "newProspects", label: "New", emoji: "🆕" },
  { key: "inboundLeads", label: "Inbnd", emoji: "🎯" },
];

export default async function DailySalesPage() {
  const today = new Date();
  const [week, platformToday, platformWeek, streak, derived] = await Promise.all([
    get7DaysOfKpis(),
    platformBreakdownForDate(today),
    platformBreakdown7Days(),
    getStreak(),
    getNotionDerivedKpis(today),
  ]);

  const crmDbUrl = "https://www.notion.so/35d0b601369a80519256ec4232d5f6a8";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Sales scorecard</div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Daily KPIs</h1>
          <p className="text-sm text-stone-500 mt-1">
            Read-only. All data derived from your Notion CRM activity (stage changes, status dates, Relation column).
            Update everything in Notion — this dashboard reflects it.
          </p>
        </div>
        <Link
          href={crmDbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Open CRM in Notion <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {/* Gamification — streak + week sparkline */}
      <StreakHero streak={streak} />

      {/* COMPREHENSIVE Notion-derived KPIs (input/output/pipeline/events/overdue) */}
      <DerivedKpisPanel kpis={derived} />

      {/* Per-platform safety caps */}
      <PlatformCapsPanel counts={platformToday} />

      {/* Today's win analysis pulled from Sales Tracker daily entry */}
      <WinAnalysisPanel />

      {/* Per-platform 7-day grid */}
      <Platform7DayGrid days={platformWeek} />

      {/* Last 7 days totals */}
      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Last 7 days · scalar counters</h2>
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-stone-50">Day</th>
                {KPI_FIELDS.map((f) => (
                  <th key={f.key} className="text-center px-2 py-2" title={f.label}>
                    {f.emoji}
                  </th>
                ))}
                <th className="text-left px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {week.map(({ date, row }) => {
                const isToday = date.toDateString() === today.toDateString();
                const empty = !row;
                return (
                  <tr key={date.toISOString()} className={isToday ? "bg-violet-50/40" : empty ? "bg-amber-50/30" : ""}>
                    <td className="px-3 py-2 text-stone-700 text-xs whitespace-nowrap sticky left-0 bg-inherit">
                      <span className={isToday ? "font-semibold text-stone-900" : ""}>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-stone-400 ml-1">{date.getDate()}</span>
                      {empty && !isToday && (
                        <span className="ml-2 text-amber-700 text-[10px]">missing</span>
                      )}
                    </td>
                    {KPI_FIELDS.map((f) => {
                      const v = row?.[f.key as keyof typeof row] as number | null | undefined;
                      return (
                        <td key={f.key} className="px-2 py-2 text-center tabular-nums text-stone-700">
                          {v ?? "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-xs text-stone-500 truncate max-w-xs">
                      {row?.notes ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500 mt-3">
          Yellow rows = no CRM activity that day. Today highlighted violet. Counters derive from contact stage changes synced from Notion.
        </p>
      </section>
    </div>
  );
}
