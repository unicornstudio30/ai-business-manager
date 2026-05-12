
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getHotLeads } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const rows = await getHotLeads(limit);
  return NextResponse.json(rows);
}
