// POST /api/admin/users/active
// Body: { userId: string, active: boolean }
// Deactivates or reactivates a user. Owner role is protected.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { findUserById, setUserActive } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const active = !!body?.active;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.id === me.id) {
    return NextResponse.json({ error: "Can't deactivate yourself" }, { status: 400 });
  }
  // Only owner can deactivate another owner OR an admin
  if ((target.role === "owner" || target.role === "admin") && me.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can deactivate an admin or owner" }, { status: 403 });
  }

  const updated = await setUserActive(userId, active);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  revalidatePath("/admin/users");
  return NextResponse.json({ ok: true, user: { id: updated.id, active: !!updated.active } });
}
