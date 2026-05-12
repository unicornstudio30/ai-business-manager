
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { financeSummary, revenueByMonth12 } from "@/lib/db/finance-summary";

export async function GET() {
  const [summary, byMonth] = await Promise.all([financeSummary(), revenueByMonth12()]);
  return NextResponse.json({ summary, revenue_by_month: byMonth });
}
