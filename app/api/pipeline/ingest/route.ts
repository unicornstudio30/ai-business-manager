// POST /api/pipeline/ingest — per-seat totals from the Unicorn Studio Pipeline
// app (numbers only). Sent when Sync is clicked in PBM (the browser asks the
// local Pipeline server to push) or via `npm run pbm-push` in ~/crm. Never
// scheduled. Auth: x-claude-api-key (enforced for /api/* by middleware.ts).
//
// This writes PBM's own database only — PBM never writes to Notion.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ingestPipelinePayload, PipelinePayloadSchema } from "@/lib/db/pipeline";

export async function POST(req: NextRequest) {
  // Machine-to-machine only: a logged-in browser session is not enough.
  const key = process.env.CLAUDE_API_KEY;
  if (key && req.headers.get("x-claude-api-key") !== key) {
    return NextResponse.json({ ok: false, error: "x-claude-api-key required" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = PipelinePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const result = await ingestPipelinePayload(parsed.data);
  return NextResponse.json({ ok: true, ...result });
}
