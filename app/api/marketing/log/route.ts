// POST /api/marketing/log
// Body: { platform, kind, count?, notes?, weekStart?, contentId? }
// Logs a marketing activity for the current user. Awards points based on
// lib/marketing/points.ts. When contentId points to a Content Calendar item,
// the source key is `manual_content:<contentId>:<platform>` (idempotent per
// content-piece + platform combo — safe to log twice, only the first sticks).
//
// DELETE /api/marketing/log?id=...
// Removes one of the current user's own activity rows.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { db, schema } from "@/lib/db/client";
import { deleteMarketingActivity } from "@/lib/db/marketing";
import { pointsFor, weekStartFor } from "@/lib/marketing/points";
import {
  ALL_KINDS,
  ALL_PLATFORMS,
  type ActivityKind,
  type Platform,
} from "@/lib/marketing/points";

const VALID_PLATFORMS = new Set(ALL_PLATFORMS.map((p) => p.platform));
const VALID_KINDS = new Set(ALL_KINDS.map((k) => k.kind));

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const platform = String(body?.platform || "");
  const kind = String(body?.kind || "");
  const count = Number.isFinite(body?.count) ? Math.max(1, Math.min(100, Math.floor(body.count))) : 1;
  let notes = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : null;
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : weekStartFor();
  const contentId = typeof body?.contentId === "string" && body.contentId ? body.contentId : null;

  if (!VALID_PLATFORMS.has(platform as Platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!VALID_KINDS.has(kind as ActivityKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // When a Content Calendar item is attached, look it up to enrich notes
  // (title + topics) and set a stable source key so a repeated log is a no-op.
  let source: string | null = null;
  if (contentId) {
    const [content] = await db
      .select({ id: schema.contentItems.id, title: schema.contentItems.title, topics: schema.contentItems.topics })
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, contentId))
      .limit(1);
    if (content) {
      source = `manual_content:${content.id}:${platform}`;
      if (!notes) {
        notes = [content.title, content.topics].filter(Boolean).join(" · ").slice(0, 200) || null;
      }
    }
  }

  const points = pointsFor(platform as Platform, kind as ActivityKind, count);
  const [row] = await db
    .insert(schema.marketingActivities)
    .values({
      userId: me.id,
      weekStart,
      platform,
      kind,
      count,
      points,
      notes,
      source,
    })
    .onConflictDoNothing({ target: schema.marketingActivities.source })
    .returning();

  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true, activity: row ?? null, deduped: !row });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ok = await deleteMarketingActivity(id, me.id);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  revalidatePath("/market-or-die");
  return NextResponse.json({ ok: true });
}
