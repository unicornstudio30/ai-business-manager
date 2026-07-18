// POST /api/sales/log
// Unified body: { contactId?, stage?, kind?, count?, notes?, weekStart? }
//
// Must include EITHER stage OR kind (both is fine — logs two rows). Channel
// is derived from the picked contact's `platform` field (LinkedIn / X /
// Facebook / …) rather than a user-picked dropdown. When contactId is set
// and the contact has a notion_page_id, an entry is appended to the CRM's
// "Log Actions" column (best-effort).
//
// DELETE /api/sales/log?id=...

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { db, schema } from "@/lib/db/client";
import { deleteSalesActivity } from "@/lib/db/sales-leaderboard";
import { ALL_KINDS, pointsFor, weekStartFor, type ActivityKind } from "@/lib/sales/points";
import { kindForStage } from "@/lib/sales/stage-credits";
import { normalizeChannelFromPlatform } from "@/lib/sales/channel-from-platform";
import { STAGES, type Stage } from "@/lib/stages";
import { appendContactLogEntry } from "@/lib/notion/contact-log";

const VALID_KINDS = new Set(ALL_KINDS.map((k) => k.kind));
const VALID_STAGES = new Set(STAGES as readonly string[]);

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : null;
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : weekStartFor();
  const contactId = typeof body?.contactId === "string" && body.contactId ? body.contactId : null;
  const stageInput = typeof body?.stage === "string" && body.stage ? body.stage : null;
  const kindInput = typeof body?.kind === "string" && body.kind ? body.kind : null;
  const count = Number.isFinite(body?.count) ? Math.max(1, Math.min(100, Math.floor(body.count))) : 1;

  if (!stageInput && !kindInput) {
    return NextResponse.json({ error: "Pick a stage or an action" }, { status: 400 });
  }
  if (stageInput && !VALID_STAGES.has(stageInput)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }
  if (kindInput && !VALID_KINDS.has(kindInput as ActivityKind)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Load the picked contact to derive channel + name + notion_page_id.
  let contact:
    | { id: string; name: string | null; platform: string | null; notionPageId: string | null }
    | null = null;
  if (contactId) {
    const [row] = await db
      .select({
        id: schema.contacts.id,
        name: schema.contacts.name,
        platform: schema.contacts.platform,
        notionPageId: schema.contacts.notionPageId,
      })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);
    contact = row ?? null;
  }

  const channel = normalizeChannelFromPlatform(contact?.platform);
  const inserted: any[] = [];
  const notionLogLines: string[] = [];

  // 1) Stage row
  if (stageInput) {
    const kind = kindForStage(stageInput as Stage);
    if (!kind) {
      return NextResponse.json({
        error: `Stage '${stageInput}' doesn't earn credit (Prospect / Connection / follow-up stages skipped)`,
      }, { status: 400 });
    }
    const points = pointsFor(channel, kind, 1);
    const stageNotes = notes ?? (contact?.name ? `Stage → ${stageInput} · ${contact.name.slice(0, 80)}` : `Stage → ${stageInput}`);
    const source = contact ? `contact_stage:${contact.id}:${stageInput}` : null;
    const [row] = await db
      .insert(schema.salesActivities)
      .values({
        userId: me.id,
        weekStart,
        channel,
        kind,
        count: 1,
        points,
        notes: stageNotes,
        source,
        contactId: contact?.id ?? null,
      })
      .onConflictDoNothing({ target: schema.salesActivities.source })
      .returning();
    if (row) {
      inserted.push({ type: "stage", row });
      notionLogLines.push(`${new Date().toISOString().slice(0, 10)} · Stage → ${stageInput} · ${channel} · +${points} pts (by ${me.name || me.email})`);
    }
  }

  // 2) Action row
  if (kindInput) {
    const kind = kindInput as ActivityKind;
    const points = pointsFor(channel, kind, count);
    const actionNotes = notes ?? (contact?.name ? `${kind.replace(/_/g, " ")} × ${count} · ${contact.name.slice(0, 80)}` : `${kind.replace(/_/g, " ")} × ${count}`);
    const [row] = await db
      .insert(schema.salesActivities)
      .values({
        userId: me.id,
        weekStart,
        channel,
        kind,
        count,
        points,
        notes: actionNotes,
        source: null,
        contactId: contact?.id ?? null,
      })
      .returning();
    if (row) {
      inserted.push({ type: "action", row });
      notionLogLines.push(`${new Date().toISOString().slice(0, 10)} · ${kind.replace(/_/g, " ")} × ${count} · ${channel} · +${points} pts (by ${me.name || me.email})`);
    }
  }

  // 3) Push to Notion "Log Actions" column (best-effort, fire and forget-ish)
  if (contact?.notionPageId && notionLogLines.length > 0) {
    // Await so the response reflects final state; failures are swallowed.
    for (const line of notionLogLines) {
      await appendContactLogEntry(contact.notionPageId, line);
    }
  }

  revalidatePath("/sell-or-die");
  return NextResponse.json({
    ok: true,
    inserted: inserted.length,
    rows: inserted,
    channel,
    contact: contact ? { id: contact.id, name: contact.name } : null,
  });
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
