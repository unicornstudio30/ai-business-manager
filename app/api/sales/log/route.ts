// POST /api/sales/log
// Two shapes:
//   mode='stage'    Body: { mode:'stage', stage, channel?, contactId?, notes?, weekStart? }
//                   Picks the sales kind + points from lib/sales/stage-credits.
//                   Source key: contact_stage:<contactId>:<stage> (idempotent)
//                   or manual_stage:<userId>:<stage>:<ts> (freeform).
//   mode='activity' Body: { mode:'activity', channel, kind, count?, notes?, weekStart? }
//                   Old-style abstract action (dm_sent / discovery_call / …).
//
// DELETE /api/sales/log?id=...

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { db, schema } from "@/lib/db/client";
import { deleteSalesActivity, logSalesActivity } from "@/lib/db/sales-leaderboard";
import { ALL_CHANNELS, ALL_KINDS, pointsFor, weekStartFor, type ActivityKind, type Channel } from "@/lib/sales/points";
import { kindForStage } from "@/lib/sales/stage-credits";
import { STAGES, type Stage } from "@/lib/stages";

const VALID_CHANNELS = new Set(ALL_CHANNELS.map((c) => c.channel));
const VALID_KINDS = new Set(ALL_KINDS.map((k) => k.kind));
const VALID_STAGES = new Set(STAGES as readonly string[]);

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "activity" ? "activity" : "stage";
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : null;
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : weekStartFor();
  const channelRaw = String(body?.channel || "linkedin");
  const channel: Channel = (VALID_CHANNELS.has(channelRaw as Channel) ? channelRaw : "linkedin") as Channel;

  if (mode === "stage") {
    const stage = String(body?.stage || "");
    if (!VALID_STAGES.has(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    const kind = kindForStage(stage as Stage);
    if (!kind) {
      return NextResponse.json({ error: `Stage '${stage}' doesn't earn credit (Prospect/Follow-up/Follow up later stages are skipped)` }, { status: 400 });
    }
    const contactId = typeof body?.contactId === "string" && body.contactId ? body.contactId : null;
    // Build source key + enriched notes
    let source: string | null = null;
    let enrichedNotes: string | null = notes;
    if (contactId) {
      const [contact] = await db
        .select({ id: schema.contacts.id, name: schema.contacts.name, status: schema.contacts.status })
        .from(schema.contacts)
        .where(eq(schema.contacts.id, contactId))
        .limit(1);
      if (contact) {
        // Same shape as auto-sync so re-syncing after a manual log is a no-op.
        source = `contact_stage:${contact.id}:${stage}`;
        if (!enrichedNotes) {
          enrichedNotes = `Stage → ${stage} · ${contact.name?.slice(0, 80) ?? "(no name)"}`;
        }
      }
    }
    const points = pointsFor(channel, kind, 1);
    const [row] = await db
      .insert(schema.salesActivities)
      .values({
        userId: me.id,
        weekStart,
        channel,
        kind,
        count: 1,
        points,
        notes: enrichedNotes,
        source,
      })
      .onConflictDoNothing({ target: schema.salesActivities.source })
      .returning();

    revalidatePath("/sell-or-die");
    return NextResponse.json({ ok: true, activity: row ?? null, deduped: !row });
  }

  // mode === "activity" — freeform abstract action (existing path)
  const kind = String(body?.kind || "");
  const count = Number.isFinite(body?.count) ? Math.max(1, Math.min(100, Math.floor(body.count))) : 1;
  if (!VALID_KINDS.has(kind as ActivityKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const row = await logSalesActivity({
    userId: me.id,
    channel,
    kind: kind as ActivityKind,
    count,
    notes,
    weekStart,
  });
  revalidatePath("/sell-or-die");
  return NextResponse.json({ ok: true, activity: row });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteSalesActivity(id, me.id);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  revalidatePath("/sell-or-die");
  return NextResponse.json({ ok: true });
}
