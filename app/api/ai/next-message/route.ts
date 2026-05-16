export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateNextMessage } from "@/lib/ai/next-message";

// POST /api/ai/next-message?contact_id=XXX[&save=true]
// Drafts the next message in the contact's sequence. If save=true, also writes
// it to the activities feed as a 'dm_sent' draft.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contact_id");
  const save = searchParams.get("save") === "true";
  if (!contactId) {
    return NextResponse.json({ ok: false, error: "contact_id required" }, { status: 400 });
  }
  try {
    const result = await generateNextMessage({ contactId, save });
    if (!result) return NextResponse.json({ ok: false, error: "OPENROUTER_API_KEY not set or contact not found" }, { status: 400 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
