export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";

// GET /api/content?limit=200 — list content items (id, title) for selectors.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "200")));
  const rows = await db
    .select({ id: schema.contentItems.id, title: schema.contentItems.title })
    .from(schema.contentItems)
    .orderBy(desc(schema.contentItems.updatedAt))
    .limit(limit);
  return NextResponse.json(rows);
}
