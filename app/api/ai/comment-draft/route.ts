export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { draftComment } from "@/lib/ai/comment-draft";

// POST /api/ai/comment-draft
// Body: { postText?: string, postUrl?: string, contactId?: string, extraContext?: string }
// Returns: { ok: true, comment: string, contactId, contactName }
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  try {
    const result = await draftComment({
      postText: body?.postText,
      postUrl: body?.postUrl,
      contactId: body?.contactId,
      extraContext: body?.extraContext,
    });
    if (!result) return NextResponse.json({ ok: false, error: "OPENROUTER_API_KEY not set" }, { status: 400 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
