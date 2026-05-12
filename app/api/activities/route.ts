
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { recomputeOne } from "@/lib/db/lead-scores";

const ActivityType = z.enum([
  "post_observed",
  "comment_drafted",
  "email_drafted",
  "audit_run",
  "follow_up_sent",
  "dm_sent",
  "note",
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const contactId = sp.get("contact_id");
  const type = sp.get("type");
  const since = sp.get("since"); // ISO date

  const conditions = [];
  if (contactId) conditions.push(eq(schema.activities.contactId, contactId));
  if (type) {
    const parsed = ActivityType.safeParse(type);
    if (parsed.success) conditions.push(eq(schema.activities.type, parsed.data));
  }
  if (since) conditions.push(gte(schema.activities.createdAt, new Date(since)));

  const rows = await db
    .select()
    .from(schema.activities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.activities.createdAt))
    .limit(200);
  return NextResponse.json(rows);
}

const CreateSchema = z.object({
  contact_id: z.string().min(1),
  type: ActivityType,
  content: z.string().min(1),
  source_url: z.string().optional(),
  claude_run_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const [row] = await db
    .insert(schema.activities)
    .values({
      contactId: parsed.data.contact_id,
      type: parsed.data.type,
      content: parsed.data.content,
      sourceUrl: parsed.data.source_url,
      claudeRunId: parsed.data.claude_run_id,
    })
    .returning();

  // Fire-and-forget recompute of lead score for this contact.
  // Cheap enough to run inline; never blocks the response.
  recomputeOne(parsed.data.contact_id).catch((e) =>
    console.error("Lead score recompute failed:", e?.message)
  );

  return NextResponse.json(row, { status: 201 });
}
