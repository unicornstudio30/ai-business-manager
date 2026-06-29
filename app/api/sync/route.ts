
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { syncNotion } from "@/lib/notion/sync";
import { runMarketingAutoSync } from "@/lib/marketing/auto-sync";

export async function POST(req: NextRequest) {
  try {
    const entity = req.nextUrl.searchParams.get("entity") as
      | "contacts"
      | "content_items"
      | "tracker_entries"
      | null;
    const results = await syncNotion(entity ?? undefined);

    // Refresh Market or Die from the data we just pulled (content publishes,
    // sent networking msgs, CRM activities). Failures here shouldn't break
    // the main sync response — log + continue.
    let marketingAutoSync: Awaited<ReturnType<typeof runMarketingAutoSync>> | null = null;
    try {
      marketingAutoSync = await runMarketingAutoSync();
    } catch (e: any) {
      console.error("[sync] marketing auto-sync failed:", e?.message ?? e);
    }

    return NextResponse.json({ ok: true, results, marketingAutoSync });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
