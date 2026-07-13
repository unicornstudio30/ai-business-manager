// POST /api/sales/log
// Body: { channel, kind, count?, notes?, weekStart? }
// DELETE /api/sales/log?id=...

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteSalesActivity, logSalesActivity } from "@/lib/db/sales-leaderboard";
import { ALL_CHANNELS, ALL_KINDS, type ActivityKind, type Channel } from "@/lib/sales/points";

const VALID_CHANNELS = new Set(ALL_CHANNELS.map((c) => c.channel));
const VALID_KINDS = new Set(ALL_KINDS.map((k) => k.kind));

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const channel = String(body?.channel || "");
  const kind = String(body?.kind || "");
  const count = Number.isFinite(body?.count) ? Math.max(1, Math.min(100, Math.floor(body.count))) : 1;
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : null;
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : undefined;

  if (!VALID_CHANNELS.has(channel as Channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }
  if (!VALID_KINDS.has(kind as ActivityKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const row = await logSalesActivity({
    userId: me.id,
    channel: channel as Channel,
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
  const ok = await deleteSalesActivity(id, me.id);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true });
}
