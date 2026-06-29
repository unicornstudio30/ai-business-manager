// GET  /api/admin/users           — list all users (owner/admin only)
// POST /api/admin/users/role      — body { userId, role } — change a user's role
// POST /api/admin/users/active    — body { userId, active } — deactivate/reactivate
// POST /api/admin/users/delete    — body { userId } — owner-only
//
// Sub-routes live under app/api/admin/users/{role,active,delete}/route.ts.
// Middleware already enforces that /admin/* and /api/admin/* require
// owner|admin role — this file adds the extra "you can't demote/delete an
// owner unless you are the owner" rules.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listUsers } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await listUsers();
  return NextResponse.json({
    me: { id: me.id, role: me.role },
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      active: !!u.active,
      createdAt: u.createdAt?.toISOString() ?? null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  });
}
