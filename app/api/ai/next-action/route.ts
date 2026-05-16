export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getNextAction } from "@/lib/ai/next-action";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contact_id");
  if (!contactId) {
    return NextResponse.json({ ok: false, error: "contact_id required" }, { status: 400 });
  }
  try {
    const result = await getNextAction(contactId);
    if (!result) return NextResponse.json({ ok: false, error: "OPENROUTER_API_KEY not set or contact not found" }, { status: 400 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
