export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDailySummary } from "@/lib/ai/daily-summary";

export async function GET() {
  try {
    const result = await getDailySummary();
    if (!result) return NextResponse.json({ ok: false, error: "OPENROUTER_API_KEY not set" }, { status: 400 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
