// POST /api/build/log
// Body: { stack, kind, count?, notes?, weekStart? }
// DELETE /api/build/log?id=...

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteBuildActivity, logBuildActivity } from "@/lib/db/build-leaderboard";
import { ALL_KINDS, ALL_STACKS, type ActivityKind, type Stack } from "@/lib/builds/points";

const VALID_STACKS = new Set(ALL_STACKS.map((s) => s.stack));
const VALID_KINDS = new Set(ALL_KINDS.map((k) => k.kind));

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const stack = String(body?.stack || "");
  const kind = String(body?.kind || "");
  const count = Number.isFinite(body?.count) ? Math.max(1, Math.min(100, Math.floor(body.count))) : 1;
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : null;
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : undefined;

  if (!VALID_STACKS.has(stack as Stack)) {
    return NextResponse.json({ error: "Invalid stack" }, { status: 400 });
  }
  if (!VALID_KINDS.has(kind as ActivityKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const row = await logBuildActivity({
    userId: me.id,
    stack: stack as Stack,
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
  const ok = await deleteBuildActivity(id, me.id);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true });
}
