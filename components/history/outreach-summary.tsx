import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import type { OutreachSummary } from "@/lib/db/outreach-summary";

type Props = {
  summary: OutreachSummary;
  periodLabel: string;  // e.g. "last 30d"
};

export function OutreachSummaryPanel({ summary, periodLabel }: Props) {
  const { input, output, ratio } = summary;
  const ratioPct = ratio !== null ? Math.round(ratio * 100) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
      {/* INPUT */}
      <section className="surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="size-4 text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Input · {periodLabel}</span>
          <span className="ml-auto text-2xl font-semibold tabular-nums text-stone-900">{input.totalActions}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="DMs" value={input.dmsSent} />
          <Stat label="Comments" value={input.commentsDrafted} />
          <Stat label="Follow-ups" value={input.followUpsSent} />
          <Stat label="Emails" value={input.emailsDrafted} />
          <Stat label="Audits" value={input.auditsRun} />
          <Stat label="Observed" value={input.postsObserved} />
        </div>
      </section>

      {/* Ratio */}
      <section className="surface p-5 flex flex-col items-center justify-center min-w-[120px]">
        <TrendingUp className="size-4 text-stone-400 mb-1" />
        <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Response rate</div>
        <div className="text-2xl font-semibold tabular-nums text-stone-900 mt-1">
          {ratioPct === null ? "—" : `${ratioPct}%`}
        </div>
        <div className="text-[10px] text-stone-400 mt-0.5">output / input</div>
      </section>

      {/* OUTPUT */}
      <section className="surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownRight className="size-4 text-emerald-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Output · {periodLabel}</span>
          <span className="ml-auto text-2xl font-semibold tabular-nums text-stone-900">{output.totalResults}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Responses" value={output.responses} />
          <Stat label="Meetings" value={output.meetingsBooked} />
          <Stat label="Calls" value={output.callsBooked} />
          <Stat label="Inbound" value={output.inboundLeads} />
          <Stat label="Closed" value={output.dealsClosed} />
          <Stat label="Won" value={output.dealsWon} tone="emerald" />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" }) {
  const valueColor = tone === "emerald" ? "text-emerald-700" : "text-stone-900";
  return (
    <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}
