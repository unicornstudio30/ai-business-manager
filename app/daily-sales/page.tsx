import {
  getKpiByDate,
  suggestedCountsForDate,
  get7DaysOfKpis,
  platformBreakdownForDate,
  platformBreakdown7Days,
} from "@/lib/db/daily-kpis";
import { TodayCard } from "@/components/daily-sales/today-card";
import { PlatformBreakdown } from "@/components/daily-sales/platform-breakdown";
import { Platform7DayGrid } from "@/components/daily-sales/platform-7day-grid";
import { fmtDate } from "@/lib/utils";

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
  const [todayRow, suggested, week, platformToday, platformWeek] = await Promise.all([
    getKpiByDate(today),
    suggestedCountsForDate(today),
    get7DaysOfKpis(),
    platformBreakdownForDate(today),
    platformBreakdown7Days(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Daily KPIs</h1>
        <p className="text-sm text-stone-500 mt-1">
          Track outreach numbers vs targets. "Apply suggested" pulls counts from
          your activities (DMs sent, comments drafted, etc.) so you don't have
          to manually count.
        </p>
      </div>

      <TodayCard today={todayRow} suggested={suggested} />

      <PlatformBreakdown rows={platformToday} />

      <Platform7DayGrid days={platformWeek} />

      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Last 7 days</h2>
        <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
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
          Yellow rows = no data logged. Today is highlighted in violet.
        </p>
      </section>
    </div>
  );
}
