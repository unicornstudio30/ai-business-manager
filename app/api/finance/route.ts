
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { INVOICE_STATUSES } from "@/lib/finance";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const rows = await db
    .select()
    .from(schema.financeEntries)
    .where(status ? eq(schema.financeEntries.status, status) : undefined)
    .orderBy(desc(schema.financeEntries.date));
  return NextResponse.json(rows);
}

const CreateSchema = z.object({
  date: z.string().describe("ISO date — invoice / line item date"),
  contactId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  lineItem: z.string().min(1),
  amount: z.number().int().describe("amount in whole dollars (or cents — your choice, be consistent)"),
  status: z.enum(INVOICE_STATUSES).default("draft"),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { date, paymentDate, ...rest } = parsed.data;
  const [row] = await db
    .insert(schema.financeEntries)
    .values({
      ...rest,
      date: new Date(date),
      paymentDate: paymentDate ? new Date(paymentDate) : null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
