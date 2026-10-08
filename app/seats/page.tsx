// Seats — every LinkedIn seat side by side. Notion columns come from the CRM
// mirror; Pipeline columns come from the Pipeline app's last push (Sync).

import Link from "next/link";
import { Users } from "lucide-react";
import { seatReport } from "@/lib/db/seat-report";
import { pipelineDaily } from "@/lib/db/pipeline";
import { ActivityTrend } from "@/components/dashboard/activity-trend";
import { SeatFilter } from "@/components/seat-filter";

export const dynamic = "force-dynamic";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const PIPELINE_STAGES = ["new", "contacted", "replied", "qualified", "proposal", "won", "lost"];

export default async function SeatsPage({ searchParams }: { searchParams: Promise<{ seat?: string }> }) {
  const sp = await searchParams;
  const seat = sp.seat || null;
  const [{ rows, pipelinePushedAt }, sent, received] = await Promise.all([
    seatReport(),
    pipelineDaily({ prefix: "messages.sent", seat }),
    pipelineDaily({ prefix: "messages.received", seat }),
  ]);
  const shown = seat ? rows.filter((r) => r.seat === seat) : rows;
  const toTrend = (xs: { date: string; value: number }[]) =>
    xs.map((x) => ({ date: x.date.slice(5), fullDate: x.date, count: x.value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <Users className="size-6 text-stone-500" /> Seats
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Each LinkedIn seat side by side — Notion CRM results and Pipeline app activity.
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Pipeline data{" "}
            {pipelinePushedAt
              ? `as of ${pipelinePushedAt.toISOString().replace("T", " ").slice(0, 16)} UTC`
              : "not received yet — open the Pipeline app on your Mac and click Sync"}
            .
          </p>
        </div>
        <SeatFilter
          seats={rows.map((r) => ({ name: r.seat, contactCount: r.notion.contacts, mapped: !!r.user }))}
          current={seat}
        />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-3 font-medium">Seat</th>
              <th className="py-2 px-2 font-medium text-right" colSpan={5}>Notion CRM</th>
              <th className="py-2 pl-2 font-medium text-right" colSpan={6}>Pipeline app (30 days)</th>
            </tr>
            <tr className="text-left text-[11px] text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-3 font-normal" />
              <th className="py-1.5 px-2 font-normal text-right">Contacts</th>
              <th className="py-1.5 px-2 font-normal text-right">Reply rate</th>
              <th className="py-1.5 px-2 font-normal text-right">Win rate</th>
              <th className="py-1.5 px-2 font-normal text-right">Won</th>
              <th className="py-1.5 px-2 font-normal text-right">Stuck</th>
              <th className="py-1.5 px-2 font-normal text-right">Real leads</th>
              <th className="py-1.5 px-2 font-normal text-right">Awaiting reply</th>
              <th className="py-1.5 px-2 font-normal text-right">Overdue follow-ups</th>
              <th className="py-1.5 px-2 font-normal text-right">Sent</th>
              <th className="py-1.5 px-2 font-normal text-right">Received</th>
              <th className="py-1.5 pl-2 font-normal text-right">Flow invited / connected / replied</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.seat} className="border-b border-stone-100 tabular-nums align-top">
                <td className="py-2 pr-3">
                  <Link href={`/funnel?seat=${encodeURIComponent(r.seat)}`} className="font-medium text-stone-900 hover:underline">
                    {r.seat}
                  </Link>
                  <div className="text-[11px] text-stone-500">
                    {r.user ? `→ ${r.user.name}${r.matchedVia === "fuzzy" ? " (fuzzy)" : ""}` : "no app user"}
                    {!r.inNotion && " · no Notion contacts yet"}
                  </div>
                </td>
                <td className="py-2 px-2 text-right">{r.notion.contacts}</td>
                <td className="py-2 px-2 text-right">{pct(r.notion.replyRate)}</td>
                <td className="py-2 px-2 text-right">{pct(r.notion.winRate)}</td>
                <td className="py-2 px-2 text-right text-emerald-700">{r.notion.won}</td>
                <td className="py-2 px-2 text-right text-amber-700">{r.notion.stuck}</td>
                {r.pipeline ? (
                  <>
                    <td className="py-2 px-2 text-right">{r.pipeline.realLeads}</td>
                    <td className="py-2 px-2 text-right">{r.pipeline.awaitingReply}</td>
                    <td className="py-2 px-2 text-right">{r.pipeline.followupsOverdue}</td>
                    <td className="py-2 px-2 text-right">{r.pipeline.messagesSent30d}</td>
                    <td className="py-2 px-2 text-right">{r.pipeline.messagesReceived30d}</td>
                    <td className="py-2 pl-2 text-right">
                      {r.pipeline.flow
                        ? `${r.pipeline.flow.invited} / ${r.pipeline.flow.connected} / ${r.pipeline.flow.replied}`
                        : "—"}
                    </td>
                  </>
                ) : (
                  <td className="py-2 pl-2 text-right text-stone-400" colSpan={6}>
                    no Pipeline data
                  </td>
                )}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={12} className="py-6 text-center text-stone-500">
                  No seats yet. Seats come from the Notion "Seat" column and the Pipeline app.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 overflow-x-auto">
        <div className="text-sm font-semibold text-stone-900 mb-3">Pipeline stages by seat</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-1.5 pr-3 font-medium">Seat</th>
              {PIPELINE_STAGES.map((s) => (
                <th key={s} className="py-1.5 px-2 font-medium text-right capitalize">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.filter((r) => r.pipeline).map((r) => (
              <tr key={r.seat} className="border-t border-stone-100 tabular-nums">
                <td className="py-1.5 pr-3">{r.seat}</td>
                {PIPELINE_STAGES.map((s) => (
                  <td key={s} className="py-1.5 px-2 text-right">{r.pipeline!.leadsByStage[s] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-stone-500 mt-3">
          Pipeline's own buckets, which PBM's groups now follow (new + contacted = Cold, replied = Engaged,
          qualified = Qualified + Call, lost = Archive).
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTrend data={toTrend(sent)} title={`Messages sent — last 30 days${seat ? ` · ${seat}` : ""}`} />
        <ActivityTrend data={toTrend(received)} title={`Messages received — last 30 days${seat ? ` · ${seat}` : ""}`} />
      </div>
    </div>
  );
}
