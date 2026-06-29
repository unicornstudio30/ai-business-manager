// POST /api/marketing/auto-sync
// Re-runs the Market or Die auto-feed from content publishes, sent
// networking messages, and CRM activities. Idempotent — only new
// (source-key) rows are inserted. Requires auth.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { runMarketingAutoSync } from "@/lib/marketing/auto-sync";

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const result = await runMarketingAutoSync();
  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true, ...result });
}
