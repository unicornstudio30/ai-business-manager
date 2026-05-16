export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

// PATCH /api/contacts/[id]/source  body: { contentId: string | null }
// Sets which content piece brought this contact in. Pass contentId=null to clear.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const contentId = body?.contentId ?? null;

  if (contentId !== null && typeof contentId !== "string") {
    return NextResponse.json({ ok: false, error: "contentId must be string or null" }, { status: 400 });
  }

  await db
    .update(schema.contacts)
    .set({ sourceContentId: contentId, updatedAt: new Date() })
    .where(eq(schema.contacts.id, id));

  return NextResponse.json({ ok: true });
}
