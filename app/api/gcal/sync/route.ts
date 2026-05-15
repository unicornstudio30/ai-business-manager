
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { syncGoogleCalendar } from "@/lib/gcal/sync";

export async function POST() {
  try {
    const result = await syncGoogleCalendar();
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
