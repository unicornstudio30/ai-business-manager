// POST /api/admin/users/notion-person
// Body: { userId: string, notionPerson: string | null }
//
// Sets the optional Notion "Person" name override for a user. The Market or
// Die auto-sync uses this to attribute CRM activity to the right teammate
// when Notion's display name doesn't match the app's user display name.
//
// Permission: same as role/active (owner or admin). Users can set their own.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { findUserById, updateUserNotionPerson } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const notionPerson =
    typeof body?.notionPerson === "string"
      ? body.notionPerson
      : body?.notionPerson === null
      ? null
      : "";

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Self-edit OK; otherwise admin/owner only
  if (userId !== me.id && me.role !== "owner" && me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await updateUserNotionPerson(userId, notionPerson || null);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  revalidatePath("/admin/users");
  return NextResponse.json({ ok: true, user: { id: updated.id, notionPerson: updated.notionPerson } });
}
