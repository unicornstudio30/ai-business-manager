
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStageGroupCounts } from "@/lib/db/queries";

export async function GET() {
  const groups = await getStageGroupCounts();
  return NextResponse.json(groups);
}
