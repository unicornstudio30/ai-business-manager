import { listClosedDeals, winLossSummary } from "@/lib/db/wins-losses";
import { ClosedDealRow } from "@/components/wins-losses/closed-deal-row";
import { Trophy, X, ShieldOff, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

function StatTile({ label, value, hint, Icon, tone }: { label: string; value: string | number; hint?: string; Icon: any; tone: "green" | "red" | "stone" | "blue" }) {
  const toneColor = { green: "text-green-700 bg-green-50", red: "text-red-700 bg-red-50", stone: "text-stone-700 bg-stone-50", blue: "text-blue-700 bg-blue-50" }[tone];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-stone-600 uppercase tracking-wide">{label}</span>
        <span className={`flex items-center justify-center w-8 h-8 rounded-md ${toneColor}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="text-3xl font-semibold text-stone-900 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-stone-500 mt-1">{hint}</div>}
    </div>
  );
}

export default async function WinsLossesPage() {
  const [deals, summary] = await Promise.all([listClosedDeals(), winLossSummary()]);

  const wins = deals.filter((d) => d.outcome === "win");
  const losses = deals.filter((d) => d.outcome === "loss");
  const disqualified = deals.filter((d) => d.outcome === "disqualified");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Wins &amp; Losses</h1>
        <p className="text-sm text-stone-500 mt-1">
          Capture WHY each deal closed — build pattern over time so you learn what works.
          Reasons are stored as <code className="px-1 bg-stone-100 rounded text-xs">closed_reason</code> activities on each contact.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Win rate" value={`${summary.winRate}%`} hint={`${summary.counts.win} won / ${summary.counts.win + summary.counts.loss} oppt'y`} Icon={BarChart3} tone="blue" />
        <StatTile label="Won" value={summary.counts.win} hint="Partnership stage" Icon={Trophy} tone="green" />
        <StatTile label="Lost" value={summary.counts.loss} hint="Lost / Closed without partnership" Icon={X} tone="red" />
        <StatTile label="Disqualified" value={summary.counts.disqualified} hint="Not a fit" Icon={ShieldOff} tone="stone" />
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
          No closed deals yet. As contacts move to Partnership, Lost, Closed without Partnership, or Not qualified in Notion, they appear here.
        </div>
      ) : (
        <>
          {wins.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Trophy className="size-4 text-green-600" /> Wins
                <span className="text-stone-400 font-normal">({wins.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {wins.map((d) => <ClosedDealRow key={d.contact.id} deal={d} />)}
              </div>
            </section>
          )}
          {losses.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <X className="size-4 text-red-600" /> Losses
                <span className="text-stone-400 font-normal">({losses.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {losses.map((d) => <ClosedDealRow key={d.contact.id} deal={d} />)}
              </div>
            </section>
          )}
          {disqualified.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <ShieldOff className="size-4 text-stone-500" /> Disqualified
                <span className="text-stone-400 font-normal">({disqualified.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {disqualified.map((d) => <ClosedDealRow key={d.contact.id} deal={d} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
