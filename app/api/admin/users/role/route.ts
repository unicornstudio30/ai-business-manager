// POST /api/admin/users/role
// Body: { userId: string, role: "owner"|"admin"|"salesperson"|"viewer" }
//
// Permission rules (enforced here, on top of the middleware admin guard):
//   - Only owner can promote anyone TO owner.
//   - Only owner can change another admin's role.
//   - Only owner can demote/delete the existing owner.
//   - Admin can change salesperson/viewer roles among salesperson/viewer.
//   - Nobody can change their own role (avoid lockout).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { findUserById, updateUserRole } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";
import type { UserRole } from "@/lib/db/schema";

const VALID_ROLES = new Set<UserRole>(["owner", "admin", "salesperson", "viewer"]);

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body?.userId === "string" ? body.userId : "";
  const role = typeof body?.role === "string" ? body.role : "";
  if (!userId || !VALID_ROLES.has(role as UserRole)) {
    return NextResponse.json({ error: "userId + valid role required" }, { status: 400 });
  }

  const target = await findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Can't change your own role (prevents accidental lockout)
  if (target.id === me.id) {
    return NextResponse.json({ error: "Can't change your own role" }, { status: 400 });
  }

  // Only owner can promote anyone TO owner
  if (role === "owner" && me.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can grant the owner role" }, { status: 403 });
  }

  // Only owner can change another admin's or owner's role
  if ((target.role === "admin" || target.role === "owner") && me.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can change an admin or owner's role" }, { status: 403 });
  }

  const updated = await updateUserRole(userId, role as UserRole);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  revalidatePath("/admin/users");
  return NextResponse.json({ ok: true, user: { id: updated.id, role: updated.role } });
}
