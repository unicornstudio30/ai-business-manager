// Seat comparison: one row per LinkedIn seat, combining the Notion CRM mirror
// (contacts, funnel, wins, stuck) with the Pipeline app's pushed totals
// (conversations, follow-ups, messages, Flow outreach).
//
// Seats are the union of Notion "Seat" values and the Pipeline app's seat
// roster, so a seat with outreach in Flow but no Notion rows yet still shows.

import { listSeats } from "./seats";
import { funnelConversion, type FunnelConversion } from "./funnel-analytics";
import { stuckDeals } from "./stuck-deals";
import { latestPipelinePush, pipelineSummary, sumPrefix } from "./pipeline";

export type SeatReportRow = {
  seat: string;
  user: { id: string; name: string; email: string } | null;
  matchedVia: string | null;
  inNotion: boolean;
  inPipeline: boolean;
  notion: {
    contacts: number;
    funnel: FunnelConversion["steps"];
    won: number;
    lost: number;
    winRate: number | null;
    replyRate: number | null;
    stuck: number;
  };
  pipeline: {
    asOf: string | null;
    leadsByStage: Record<string, number>;
    realLeads: number;
    awaitingReply: number;
    followupsOpen: number;
    followupsOverdue: number;
    messagesSent30d: number;
    messagesReceived30d: number;
    stageChanges30d: number;
    meetings30d: number;
    flow: { leads: number; invited: number; connected: number; replied: number; messagesSent: number } | null;
  } | null;
};

export async function seatReport(opts: { days?: number } = {}): Promise<{
  rows: SeatReportRow[];
  pipelinePushedAt: Date | null;
}> {
  const [seats, summaries, push] = await Promise.all([
    listSeats(),
    pipelineSummary({ days: opts.days ?? 30 }),
    latestPipelinePush(),
  ]);
  const names = new Set<string>([
    ...seats.map((s) => s.name),
    ...summaries.map((s) => s.seat),
    ...(push?.seats ?? []).map((s) => s.name),
  ]);

  const rows: SeatReportRow[] = [];
  for (const name of [...names].sort()) {
    const seat = seats.find((s) => s.name === name) ?? null;
    const sum = summaries.find((s) => s.seat === name) ?? null;
    const [funnel, stuck] = await Promise.all([funnelConversion({ seat: name }), stuckDeals({ seat: name })]);
    const g = sum?.gauges ?? {};
    const t = sum?.totals ?? {};
    const hasFlow = Object.keys(g).some((k) => k.startsWith("flow."));
    rows.push({
      seat: name,
      user: seat?.user ?? null,
      matchedVia: seat?.matchedVia ?? null,
      inNotion: !!seat,
      inPipeline: !!sum || !!push?.seats.some((s) => s.name === name),
      notion: {
        contacts: funnel.contacts,
        funnel: funnel.steps,
        won: funnel.won,
        lost: funnel.lost,
        winRate: funnel.winRate,
        replyRate: funnel.replyRate,
        stuck: stuck.length,
      },
      pipeline: sum
        ? {
            asOf: sum.asOf,
            leadsByStage: Object.fromEntries(
              Object.entries(g)
                .filter(([k]) => k.startsWith("leads.stage."))
                .map(([k, v]) => [k.slice("leads.stage.".length), v])
            ),
            realLeads: g["leads.real"] ?? 0,
            awaitingReply: g["conversations.awaiting_reply"] ?? 0,
            followupsOpen: g["followups.open"] ?? 0,
            followupsOverdue: g["followups.overdue"] ?? 0,
            messagesSent30d: sumPrefix(t, "messages.sent"),
            messagesReceived30d: sumPrefix(t, "messages.received"),
            stageChanges30d: t["stage_changes"] ?? 0,
            meetings30d: t["meetings"] ?? 0,
            flow: hasFlow
              ? {
                  leads: g["flow.leads"] ?? 0,
                  invited: g["flow.invited"] ?? 0,
                  connected: g["flow.connected"] ?? 0,
                  replied: g["flow.replied"] ?? 0,
                  messagesSent: g["flow.messages_sent"] ?? 0,
                }
              : null,
          }
        : null,
    });
  }
  return { rows, pipelinePushedAt: push?.receivedAt ?? null };
}
