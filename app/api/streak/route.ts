export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStreak } from "@/lib/db/streak";
import { getNotionDerivedKpis } from "@/lib/db/notion-derived-kpis";

export async function GET() {
  const [streak, derived] = await Promise.all([
    getStreak(),
    getNotionDerivedKpis(new Date()),
  ]);
  // Today is "logged" if ANY action OR outcome happened today derived from Notion
  const todayLogged = streak.todayLogged || derived.totalActions > 0 || derived.totalOutcomes > 0 || derived.newProspects > 0;
  return NextResponse.json({
    ...streak,
    todayLogged,
    todayActions: derived.totalActions,
    todayOutcomes: derived.totalOutcomes,
    overdueFollowUps: derived.followUpsOverdue.length,
  });
}
