
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { INVOICE_STATUSES } from "@/lib/finance";

const PatchSchema = z.object({
  date: z.string().optional(),
  contactId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  lineItem: z.string().optional(),
  amount: z.number().int().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const patch: any = { ...parsed.data };
  if (parsed.data.date !== undefined) patch.date = new Date(parsed.data.date);
  if (parsed.data.paymentDate !== undefined) {
    patch.paymentDate = parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null;
  }
  // If marking paid and no paymentDate provided, default to now
  if (parsed.data.status === "paid" && !patch.paymentDate) patch.paymentDate = new Date();

  const [row] = await db
    .update(schema.financeEntries)
    .set(patch)
    .where(eq(schema.financeEntries.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.delete(schema.financeEntries).where(eq(schema.financeEntries.id, id));
  return NextResponse.json({ ok: true });
}
