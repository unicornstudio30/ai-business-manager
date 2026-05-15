// Google Calendar sync via the secret ICS feed.
// Fetches the user's Google Calendar ICS URL, parses with node-ical,
// upserts events into the meetings table, links by attendee email.
//
// To use:
// 1. In Google Calendar → Settings → "Integrate calendar" → copy "Secret address in iCal format"
// 2. Paste into .env.local as GCAL_ICS_URL
// 3. POST /api/gcal/sync (or schedule via cron)
//
// Read-only. ~24h sync delay possible on Google's end.

import { db, schema } from "../db/client";
import { eq, and, gte, lt } from "drizzle-orm";

export const GCAL_ICS_URL = process.env.GCAL_ICS_URL;
export const isGcalConfigured = () => !!GCAL_ICS_URL;

type SyncResult = { entity: string; pulled: number; deleted: number; error?: string };

// Heuristic: extract a meeting URL from event location or description.
function extractMeetingUrl(event: any): string | null {
  if (event.location) {
    const m = event.location.match(/https?:\/\/[^\s]+/);
    if (m) return m[0];
  }
  if (event.description) {
    const m = String(event.description).match(/https?:\/\/(meet\.google\.com|zoom\.us|us\d+web\.zoom\.us|calendly\.com|loom\.com)\/[^\s<>"]+/);
    if (m) return m[0];
  }
  return null;
}

// Pull an attendee email out of an ATTENDEE list (node-ical normalizes shapes).
function extractAttendeeEmails(event: any): string[] {
  const a = event.attendee;
  if (!a) return [];
  const list = Array.isArray(a) ? a : [a];
  return list
    .map((x: any) => {
      if (typeof x === "string") {
        const m = x.match(/mailto:([^>]+)/i);
        return m ? m[1].toLowerCase() : null;
      }
      if (typeof x?.val === "string") {
        const m = x.val.match(/mailto:([^>]+)/i);
        return m ? m[1].toLowerCase() : null;
      }
      if (typeof x?.params?.CN === "string") return null; // skip name-only entries
      return null;
    })
    .filter((e: string | null): e is string => !!e);
}

export async function syncGoogleCalendar(opts: { fromDays?: number; toDays?: number } = {}): Promise<SyncResult> {
  if (!isGcalConfigured()) {
    return { entity: "meetings", pulled: 0, deleted: 0, error: "GCAL_ICS_URL not set" };
  }

  const fromDays = opts.fromDays ?? 14;
  const toDays = opts.toDays ?? 60;
  const start = new Date();
  let pulled = 0;
  let deleted = 0;
  let errorMsg: string | undefined;

  try {
    // Dynamic import — node-ical's rrule dep tries to call BigInt at module-load
    // which crashes Next.js serverless page-data collection. Lazy import sidesteps it.
    const ical = await import("node-ical");
    const data = await ical.async.fromURL(GCAL_ICS_URL!);

    const windowStart = new Date(Date.now() - fromDays * 86400000);
    const windowEnd = new Date(Date.now() + toDays * 86400000);

    // Pre-fetch contacts for email matching
    const contacts = await db
      .select({ id: schema.contacts.id, email: schema.contacts.email })
      .from(schema.contacts);
    const byEmail = new Map(
      contacts.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id])
    );

    // Track which event UIDs we see in this sync — used for cleanup.
    const seenIds = new Set<string>();

    for (const key of Object.keys(data)) {
      const ev: any = (data as any)[key];
      if (!ev || ev.type !== "VEVENT") continue;
      if (!ev.uid || !ev.start) continue;

      // Skip events outside window
      const startDt: Date = new Date(ev.start);
      if (startDt < windowStart || startDt > windowEnd) continue;

      seenIds.add(ev.uid);

      // Try to link to a contact
      const attendeeEmails = extractAttendeeEmails(ev);
      const linkedContactId =
        attendeeEmails.map((e) => byEmail.get(e)).find((id) => !!id) ?? null;
      const inviteeEmail = attendeeEmails[0] ?? null;

      const row = {
        externalId: ev.uid,
        source: "gcal" as const,
        contactId: linkedContactId ?? null,
        inviteeName: ev.organizer?.params?.CN || null,
        inviteeEmail,
        eventName: ev.summary || "(untitled)",
        scheduledAt: startDt,
        endedAt: ev.end ? new Date(ev.end) : null,
        status: ev.status === "CANCELLED" ? "canceled" : "active",
        meetingUrl: extractMeetingUrl(ev),
        rescheduleUrl: null,
        cancelUrl: null,
        questionsAndAnswers: null,
        notes: ev.description ? String(ev.description).slice(0, 2000) : null,
        updatedAt: new Date(),
      };

      const existing = await db
        .select({ id: schema.meetings.id })
        .from(schema.meetings)
        .where(eq(schema.meetings.externalId, ev.uid))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.meetings).values(row);
      } else {
        await db.update(schema.meetings).set(row).where(eq(schema.meetings.id, existing[0].id));
      }
      pulled++;
    }

    // Optional cleanup: delete gcal-source meetings in the window that we DIDN'T see
    // (those events have been removed from Google Calendar).
    const localInWindow = await db
      .select({ id: schema.meetings.id, externalId: schema.meetings.externalId })
      .from(schema.meetings)
      .where(
        and(
          eq(schema.meetings.source, "gcal"),
          gte(schema.meetings.scheduledAt, windowStart),
          lt(schema.meetings.scheduledAt, windowEnd)
        )
      );
    for (const row of localInWindow) {
      if (row.externalId && !seenIds.has(row.externalId)) {
        await db.delete(schema.meetings).where(eq(schema.meetings.id, row.id));
        deleted++;
      }
    }
  } catch (err: any) {
    errorMsg = err?.message || String(err);
  }

  await db.insert(schema.syncLog).values({
    entity: "meetings" as any,
    direction: "pull",
    startedAt: start,
    finishedAt: new Date(),
    rowsChanged: pulled,
    error: errorMsg ?? null,
  });

  return { entity: "meetings", pulled, deleted, error: errorMsg };
}
