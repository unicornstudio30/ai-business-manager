export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { classifyPending } from "@/lib/ai/classify-icp";

// POST /api/ai/classify-pending?limit=10  — classify up to N unclassified contacts.
// Fired best-effort by SyncButton after Notion sync. Free-tier rate-limit aware
// (stops early on 429).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "10");
  try {
    const result = await classifyPending(Math.max(1, Math.min(50, limit)));
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
