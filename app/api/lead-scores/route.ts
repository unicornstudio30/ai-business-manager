
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { recomputeAll, recomputeOne, getScoresMap } from "@/lib/db/lead-scores";

export async function GET() {
  const map = await getScoresMap();
  return NextResponse.json(Object.fromEntries(map));
}

export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const contactId = sp.get("contact_id");
  if (contactId) {
    const result = await recomputeOne(contactId);
    return NextResponse.json({ ok: true, contact_id: contactId, result });
  }
  const count = await recomputeAll();
  return NextResponse.json({ ok: true, recomputed: count });
}
