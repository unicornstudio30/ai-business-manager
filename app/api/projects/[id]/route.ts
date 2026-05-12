
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { PROJECT_STATUSES, SERVICE_LINES } from "@/lib/projects";

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

const PatchSchema = z.object({
  name: z.string().optional(),
  contactId: z.string().optional().nullable(),
  serviceLine: z.enum(SERVICE_LINES).optional().nullable(),
  scopeSummary: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  price: z.number().int().optional().nullable(),
  setupFee: z.number().int().optional().nullable(),
  monthlyRetainer: z.number().int().optional().nullable(),
  deliverables: z.array(z.string()).optional(),
  blockers: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const patch: any = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.startDate !== undefined) {
    patch.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  }
  if (parsed.data.dueDate !== undefined) {
    patch.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.deliverables !== undefined) {
    patch.deliverables = JSON.stringify(parsed.data.deliverables);
  }
  const [row] = await db
    .update(schema.projects)
    .set(patch)
    .where(eq(schema.projects.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}
