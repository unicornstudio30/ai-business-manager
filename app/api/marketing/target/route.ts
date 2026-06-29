// POST /api/marketing/target
// Body: { userId, weekStart, targetPoints }
// Admin/owner sets a custom weekly target for any user (overrides the
// level-derived default).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { setWeeklyTarget } from "@/lib/db/marketing";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (me.role !== "owner" && me.role !== "admin") {
    return NextResponse.json({ error: "Admin or owner required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : "";
  const targetPoints = Number.isFinite(body?.targetPoints) ? Math.max(0, Math.floor(body.targetPoints)) : NaN;

  if (!userId || !weekStart || !Number.isFinite(targetPoints)) {
    return NextResponse.json({ error: "userId + weekStart + targetPoints required" }, { status: 400 });
  }

  await setWeeklyTarget({ userId, weekStart, targetPoints, setBy: me.id });
  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true });
}
