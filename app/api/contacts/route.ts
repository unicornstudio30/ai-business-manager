
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listContacts } from "@/lib/db/queries";
import { db, schema } from "@/lib/db/client";
import { z } from "zod";
import { STAGES } from "@/lib/stages";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rows = await listContacts({
    status: sp.get("status") ?? undefined,
    search: sp.get("search") ?? undefined,
    country: sp.get("country") ?? undefined,
    platform: sp.get("platform") ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
  });
  return NextResponse.json(rows);
}

const CreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  contactUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  status: z.enum(STAGES).optional(),
  platform: z.string().optional(),
  country: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const now = new Date();
  const [row] = await db
    .insert(schema.contacts)
    .values({
      ...parsed.data,
      savedDate: now,
      statusDate: now,
      lastTouchAt: now,
      dirty: 1, // queue for push to Notion
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
