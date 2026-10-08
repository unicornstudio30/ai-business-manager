// Funnel & conversion — how contacts move through the pipeline, per seat.
// Built from PBM's stage history (recorded on every Notion pull) and the
// current Notion mirror. Read-only.

import { GitBranch } from "lucide-react";
import { funnelConversion, timeInStage, weeklyStageMoves } from "@/lib/db/funnel-analytics";
import { stageHistoryCoverage } from "@/lib/notion/stage-history";
import { listSeats } from "@/lib/db/seats";
import { SeatFilter } from "@/components/seat-filter";
import { StatCard } from "@/components/dashboard/stat-card";
import { stageColor } from "@/lib/stages";

export const dynamic = "force-dynamic";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const days = (x: number | null) => (x === null ? "—" : x < 1 ? "<1d" : `${Math.round(x)}d`);

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ seat?: string }> }) {
  const sp = await searchParams;
  const seat = sp.seat || null;
  const [conv, timing, weekly, coverage, seats] = await Promise.all([
    funnelConversion({ seat }),
    timeInStage({ seat }),
    weeklyStageMoves({ seat, weeks: 12 }),
    stageHistoryCoverage(),
    listSeats(),
  ]);
  const maxReached = Math.max(1, ...conv.steps.map((s) => s.reached));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <GitBranch className="size-6 text-stone-500" /> Funnel &amp; conversion
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            How contacts move from Cold to Won{seat ? ` for ${seat}` : " across all seats"}. Groups match the Pipeline app.
          </p>
        </div>
        <SeatFilter
          seats={seats.map((s) => ({ name: s.name, contactCount: s.contactCount, mapped: !!s.user }))}
          current={seat}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Contacts" value={conv.contacts} />
        <StatCard label="Reply rate" value={pct(conv.replyRate)} tone="amber" />
        <StatCard label="Win rate" value={pct(conv.winRate)} tone="green" />
        <StatCard label="Won / lost" value={`${conv.won} / ${conv.lost}`} />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-baseline justify-between mb-4">
          <div className="text-sm font-semibold text-stone-900">Stage-to-stage conversion</div>
          <div className="text-xs text-stone-500">"Reached" = furthest group a contact has ever been in</div>
        </div>
        <div className="flex flex-col gap-3">
          {conv.steps.map((s) => (
            <div key={s.group} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-sm">
              <span className="font-medium text-stone-700">{s.group}</span>
              <div className="h-6 rounded-md bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-md bg-stone-700/80"
                  style={{ width: `${Math.max(2, (s.reached / maxReached) * 100)}%` }}
                />
              </div>
              <span className="tabular-nums text-stone-600 text-right min-w-[150px]">
                {s.reached} reached · {s.current} now
                {s.conversionFromPrev !== null && (
                  <span className="ml-2 text-stone-900 font-medium">{pct(s.conversionFromPrev)}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 overflow-x-auto">
          <div className="text-sm font-semibold text-stone-900 mb-3">Time in stage</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-1.5 pr-2 font-medium">Stage</th>
                <th className="py-1.5 px-2 font-medium text-right">Median stay</th>
                <th className="py-1.5 px-2 font-medium text-right">Open now</th>
                <th className="py-1.5 pl-2 font-medium text-right">Median age</th>
              </tr>
            </thead>
            <tbody>
              {timing.map((t) => (
                <tr key={t.stage} className="border-t border-stone-100">
                  <td className="py-1.5 pr-2">
                    <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${stageColor(t.stage)}`}>
                      {t.stage}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {days(t.medianDaysCompleted)}
                    {t.completedStays > 0 && <span className="text-stone-400"> ({t.completedStays})</span>}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{t.openNow}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">{days(t.medianDaysOpen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 overflow-x-auto">
          <div className="text-sm font-semibold text-stone-900 mb-3">Stage moves per week</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-1.5 pr-2 font-medium">Week of</th>
                <th className="py-1.5 px-2 font-medium text-right">New</th>
                <th className="py-1.5 px-2 font-medium text-right">Forward</th>
                <th className="py-1.5 px-2 font-medium text-right">Back</th>
                <th className="py-1.5 px-2 font-medium text-right">Won</th>
                <th className="py-1.5 pl-2 font-medium text-right">Lost</th>
              </tr>
            </thead>
            <tbody>
              {[...weekly].reverse().map((w) => (
                <tr key={w.weekStart} className="border-t border-stone-100 tabular-nums">
                  <td className="py-1.5 pr-2">{w.weekStart}</td>
                  <td className="py-1.5 px-2 text-right">{w.entered}</td>
                  <td className="py-1.5 px-2 text-right">{w.forward}</td>
                  <td className="py-1.5 px-2 text-right">{w.backward}</td>
                  <td className="py-1.5 px-2 text-right text-emerald-700">{w.won}</td>
                  <td className="py-1.5 pl-2 text-right text-red-700">{w.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <p className="text-xs text-stone-500">
        Notion only stores each contact's current stage, so PBM records every change it sees when you click Sync.
        {coverage.since
          ? ` History since ${coverage.since.toISOString().slice(0, 10)}: ${coverage.events} events (${coverage.seeded} starting points).`
          : " History starts with the next Sync."}{" "}
        Stage changes made between two Syncs show as one move.
      </p>
    </div>
  );
}
