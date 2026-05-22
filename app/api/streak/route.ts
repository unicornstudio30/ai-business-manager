export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStreak } from "@/lib/db/streak";

export async function GET() {
  const streak = await getStreak();
  return NextResponse.json(streak);
}
