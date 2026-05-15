
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { getContactById, getContactActivities } from "@/lib/db/queries";
import { z } from "zod";
import { STAGES } from "@/lib/stages";

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const contact = await getContactById(id);
  if (!contact) return NextResponse.json({ error: "not found" }, { status: 404 });
  const activities = await getContactActivities(id);
  return NextResponse.json({ contact, activities });
}

const PatchSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  contactUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  status: z.enum(STAGES).optional(),
  statusDate: z.string().optional(),  // ISO date
  followUpDate: z.string().optional().nullable(),
  remarks: z.string().optional(),
  engageTouch: z.number().int().optional(),
  platform: z.string().optional(),
  country: z.string().optional(),
  closedReason: z.string().optional().nullable(),
  latestAuditSummary: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const patch: any = { ...parsed.data, updatedAt: new Date(), dirty: 1 };
  if (parsed.data.statusDate) patch.statusDate = new Date(parsed.data.statusDate);
  if (parsed.data.followUpDate === null) patch.followUpDate = null;
  else if (parsed.data.followUpDate) patch.followUpDate = new Date(parsed.data.followUpDate);
  if (parsed.data.status) patch.lastTouchAt = new Date();
  const [row] = await db
    .update(schema.contacts)
    .set(patch)
    .where(eq(schema.contacts.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
  return NextResponse.json({ ok: true });
}
