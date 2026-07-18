// POST /api/setup-notion?target=crm|content
// Ensures the requested Notion database has the columns / select options
// the app expects. Idempotent.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { setupNotionContentColumns, setupNotionCrmColumns } from "@/lib/notion/setup";

export async function POST(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target") || "crm";

  if (target === "content") {
    const result = await setupNotionContentColumns();
    if (result.error) return NextResponse.json({ ok: false, target, ...result }, { status: 500 });
    return NextResponse.json({ ok: true, target, ...result });
  }

  // Default: CRM
  const result = await setupNotionCrmColumns();
  if (result.error) return NextResponse.json({ ok: false, target: "crm", ...result }, { status: 500 });
  return NextResponse.json({ ok: true, target: "crm", ...result });
}
