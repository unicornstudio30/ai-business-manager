// POST /api/admin/users/delete
// Body: { userId: string }
// Hard-deletes a user. Owner-only. Self-delete blocked.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteUser, findUserById } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can delete users" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (userId === me.id) {
    return NextResponse.json({ error: "Can't delete yourself" }, { status: 400 });
  }

  const target = await findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ok = await deleteUser(userId);
  if (!ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

  revalidatePath("/admin/users");
  return NextResponse.json({ ok: true });
}
