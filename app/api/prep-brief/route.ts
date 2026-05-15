
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildPrepBrief } from "@/lib/prep-brief";

export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get("meeting_id");
  if (!meetingId) return NextResponse.json({ error: "meeting_id required" }, { status: 400 });
  const brief = await buildPrepBrief(meetingId);
  if (!brief) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  return NextResponse.json(brief);
}
