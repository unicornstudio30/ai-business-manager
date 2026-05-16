// "How much input did I give and how much output did I get" — the sales
// scorecard for any time window. Aggregates across activities + meetings +
// deals_closed + daily_sales_kpis.

import { db, schema } from "./client";
import { and, gte, lte, isNotNull, inArray } from "drizzle-orm";

export type OutreachSummary = {
  input: {
    dmsSent: number;
    commentsDrafted: number;
    emailsDrafted: number;
    followUpsSent: number;
    auditsRun: number;
    postsObserved: number;
    totalActions: number;       // sum of all the above
  };
  output: {
    meetingsBooked: number;
    dealsClosed: number;         // total in the period
    dealsWon: number;            // subset where status === "Partnership"
    inboundLeads: number;        // from daily_sales_kpis.inboundLeads in period
    responses: number;           // from daily_sales_kpis.responses in period
    callsBooked: number;         // from daily_sales_kpis.callsBooked in period
    totalResults: number;        // sum of all the above
  };
  // Quick ratio: output / input. Higher = better conversion.
  ratio: number | null;          // null when no input yet
};

const INPUT_TYPES = ["dm_sent", "comment_drafted", "email_drafted", "follow_up_sent", "audit_run", "post_observed"] as const;

export async function getOutreachSummary(opts: { since: Date; until?: Date }): Promise<OutreachSummary> {
  const since = opts.since;
  const until = opts.until ?? new Date();

  // 1) INPUT — activities of outbound types
  const activities = await db
    .select({ type: schema.activities.type })
    .from(schema.activities)
    .where(and(
      gte(schema.activities.createdAt, since),
      lte(schema.activities.createdAt, until),
      inArray(schema.activities.type, [...INPUT_TYPES])
    ));
  const byType: Record<string, number> = {};
  for (const a of activities) byType[a.type] = (byType[a.type] ?? 0) + 1;
  const input = {
    dmsSent: byType.dm_sent ?? 0,
    commentsDrafted: byType.comment_drafted ?? 0,
    emailsDrafted: byType.email_drafted ?? 0,
    followUpsSent: byType.follow_up_sent ?? 0,
    auditsRun: byType.audit_run ?? 0,
    postsObserved: byType.post_observed ?? 0,
    totalActions: activities.length,
  };

  // 2) OUTPUT — meetings + deals_closed + KPI rollups
  const [meetings, closedContacts, kpis] = await Promise.all([
    db.select({ id: schema.meetings.id, contactId: schema.meetings.contactId })
      .from(schema.meetings)
      .where(and(gte(schema.meetings.scheduledAt, since), lte(schema.meetings.scheduledAt, until))),
    db.select({ status: schema.contacts.status })
      .from(schema.contacts)
      .where(and(
        isNotNull(schema.contacts.closedDate),
        gte(schema.contacts.closedDate, since),
        lte(schema.contacts.closedDate, until)
      )),
    db.select({
        inboundLeads: schema.dailySalesKpis.inboundLeads,
        responses: schema.dailySalesKpis.responses,
        callsBooked: schema.dailySalesKpis.callsBooked,
      })
      .from(schema.dailySalesKpis)
      .where(and(
        isNotNull(schema.dailySalesKpis.date),
        gte(schema.dailySalesKpis.date, since),
        lte(schema.dailySalesKpis.date, until)
      )),
  ]);
  const dealsWon = closedContacts.filter((c) => c.status === "Partnership").length;
  const kpiSum = (key: "inboundLeads" | "responses" | "callsBooked") =>
    kpis.reduce((s, k) => s + ((k[key] as number | null) ?? 0), 0);

  const output = {
    meetingsBooked: meetings.length,
    dealsClosed: closedContacts.length,
    dealsWon,
    inboundLeads: kpiSum("inboundLeads"),
    responses: kpiSum("responses"),
    callsBooked: kpiSum("callsBooked"),
    totalResults: 0,
  };
  output.totalResults = output.meetingsBooked + output.dealsClosed + output.inboundLeads + output.responses;

  const ratio = input.totalActions === 0 ? null : output.totalResults / input.totalActions;

  return { input, output, ratio };
}
