
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const rows = await db
    .select()
    .from(schema.audits)
    .orderBy(desc(schema.audits.createdAt))
    .limit(200);
  return NextResponse.json(rows);
}

const CreateSchema = z.object({
  url: z.string().min(1),
  contact_id: z.string().optional().nullable(),
  summary: z.string().optional(),
  scores: z.record(z.string(), z.number()).optional(),  // {design: 4, copy: 3, ...}
  detected_stack: z.array(z.string()).optional(),
  missing_pages: z.array(z.string()).optional(),
  email_draft: z.string().optional(),
  claude_run_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const [row] = await db
    .insert(schema.audits)
    .values({
      url: parsed.data.url,
      contactId: parsed.data.contact_id ?? null,
      summary: parsed.data.summary ?? null,
      scores: parsed.data.scores ? JSON.stringify(parsed.data.scores) : null,
      detectedStack: parsed.data.detected_stack ? JSON.stringify(parsed.data.detected_stack) : null,
      missingPages: parsed.data.missing_pages ? JSON.stringify(parsed.data.missing_pages) : null,
      emailDraft: parsed.data.email_draft ?? null,
      claudeRunId: parsed.data.claude_run_id ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
