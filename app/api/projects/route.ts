
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { PROJECT_STATUSES, SERVICE_LINES } from "@/lib/projects";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const rows = await db
    .select()
    .from(schema.projects)
    .where(status ? eq(schema.projects.status, status) : undefined)
    .orderBy(desc(schema.projects.startDate));
  return NextResponse.json(rows);
}

const CreateSchema = z.object({
  name: z.string().min(1),
  contactId: z.string().optional(),
  serviceLine: z.enum(SERVICE_LINES).optional(),
  scopeSummary: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional().default("Briefing"),
  price: z.number().int().optional(),
  setupFee: z.number().int().optional(),
  monthlyRetainer: z.number().int().optional(),
  deliverables: z.array(z.string()).optional(),
  blockers: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { startDate, dueDate, deliverables, ...rest } = parsed.data;
  const [row] = await db
    .insert(schema.projects)
    .values({
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      deliverables: deliverables ? JSON.stringify(deliverables) : null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
