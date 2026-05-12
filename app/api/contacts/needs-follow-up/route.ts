
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNeedsFollowUp } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? 11);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const rows = await getNeedsFollowUp(days, limit);
  return NextResponse.json(rows);
}
