
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getDashboardStats,
  getHotLeads,
  getNeedsFollowUp,
  getStageGroupCounts,
  getTodayKpi,
  getYesterdayKpi,
} from "@/lib/db/queries";
import { syncStatus } from "@/lib/notion/sync";

export async function GET() {
  const [stats, hotLeads, followUps, groups, todayKpi, yesterdayKpi, sync] = await Promise.all([
    getDashboardStats(),
    getHotLeads(10),
    getNeedsFollowUp(11, 10),
    getStageGroupCounts(),
    getTodayKpi(),
    getYesterdayKpi(),
    syncStatus(),
  ]);

  // Yesterday-data-missing flag
  const yesterdayMissing = !yesterdayKpi || (
    !yesterdayKpi.coldDmsSent && !yesterdayKpi.coldEmailsSent &&
    !yesterdayKpi.followUpsSent && !yesterdayKpi.inboundLeads
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    stats,
    hotLeads,
    needsFollowUp: followUps,
    stageGroups: groups,
    todayKpi,
    yesterdayKpi,
    yesterdayMissing,
    sync,
  });
}
