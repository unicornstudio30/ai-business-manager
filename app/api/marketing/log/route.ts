// POST /api/marketing/log
// Body: { platform, kind, count?, notes?, weekStart? }
// Logs a marketing activity for the current user. Awards points based on
// lib/marketing/points.ts.
//
// DELETE /api/marketing/log?id=...
// Removes one of the current user's own activity rows.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteMarketingActivity, logMarketingActivity } from "@/lib/db/marketing";
import {
  ALL_KINDS,
  ALL_PLATFORMS,
  type ActivityKind,
  type Platform,
} from "@/lib/marketing/points";

const VALID_PLATFORMS = new Set(ALL_PLATFORMS.map((p) => p.platform));
const VALID_KINDS = new Set(ALL_KINDS.map((k) => k.kind));

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const platform = String(body?.platform || "");
  const kind = String(body?.kind || "");
  const count = Number.isFinite(body?.count) ? Math.max(1, Math.min(100, Math.floor(body.count))) : 1;
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : null;
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : undefined;

  if (!VALID_PLATFORMS.has(platform as Platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!VALID_KINDS.has(kind as ActivityKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const row = await logMarketingActivity({
    userId: me.id,
    platform: platform as Platform,
    kind: kind as ActivityKind,
    count,
    notes,
    weekStart,
  });

  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true, activity: row });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ok = await deleteMarketingActivity(id, me.id);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true });
}
