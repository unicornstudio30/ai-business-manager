
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { syncNotion } from "@/lib/notion/sync";

export async function POST(req: NextRequest) {
  try {
    const entity = req.nextUrl.searchParams.get("entity") as
      | "contacts"
      | "content_items"
      | "tracker_entries"
      | null;
    const results = await syncNotion(entity ?? undefined);
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
