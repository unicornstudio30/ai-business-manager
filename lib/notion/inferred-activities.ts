// Inferred-activity emitter for Path B Daily KPI tracking.
// When a contact's Notion CRM state changes, we generate matching activity
// rows so the daily KPI counters (which read from activities) light up.
//
// Triggers:
//   - Engage Touch went UP by N → emit N dm_sent activities (channel = contact platform)
//   - Status moved from a "waiting" stage to a "responded" stage → emit a note
//     activity tagged "[Inferred] reply received"
//   - Status moved from Prospect → 1st message → emit dm_sent (you sent the
//     first message). Engage Touch increment also covers this case usually,
//     so we de-dupe.
//
// Activities are stamped with notionLastEditedAt so they fall on the day the
// change actually happened (not when our sync ran). Content is prefixed
// "[Inferred]" so they're distinguishable in the Activities feed.

import { db, schema } from "../db/client";
import { platformToChannel } from "../inbox";
import type { Contact } from "../db/schema";

const REPLY_TARGET_STAGES = new Set([
  "Lead",
  "1st Lead Follow up",
  "2nd Lead Follow up",
  "Qualified",
]);
const WAITING_STAGES = new Set([
  "1st message",
  "1st Prospect Follow-up",
  "2nd Prospect Follow up",
]);

export async function emitInferredActivities(
  prev: Contact,
  next: ReturnType<typeof import("./contacts-mapper").notionToContact>,
  contactId: string
): Promise<number> {
  const stamp = next.notionLastEditedAt ?? new Date();
  const channel = platformToChannel(next.platform) ?? null;
  let emitted = 0;

  // 1) Engage Touch went up — count each increment as a dm_sent
  const prevTouch = prev.engageTouch ?? 0;
  const nextTouch = next.engageTouch ?? 0;
  if (nextTouch > prevTouch) {
    const delta = nextTouch - prevTouch;
    for (let i = 0; i < delta; i++) {
      await db.insert(schema.activities).values({
        contactId,
        type: "dm_sent",
        content: `[Inferred from Notion] Engage Touch ${prevTouch} → ${nextTouch} (step ${prevTouch + i + 1})`,
        channel,
        createdAt: stamp,
      });
      emitted++;
    }
  }

  // 2) Status went from "waiting" to "responded" — likely a reply
  const prevStatus = prev.status ?? "";
  const nextStatus = next.status ?? "";
  if (prevStatus !== nextStatus) {
    if (WAITING_STAGES.has(prevStatus) && REPLY_TARGET_STAGES.has(nextStatus)) {
      await db.insert(schema.activities).values({
        contactId,
        type: "note",
        content: `[Inferred from Notion] Status moved ${prevStatus} → ${nextStatus} — reply received`,
        channel,
        createdAt: stamp,
      });
      emitted++;
    }

    // 3) First-time outreach: Prospect → 1st message
    // Skip if engageTouch increment already covered this (avoid double-count)
    if (prevStatus === "Prospect" && nextStatus === "1st message" && nextTouch <= prevTouch) {
      await db.insert(schema.activities).values({
        contactId,
        type: "dm_sent",
        content: `[Inferred from Notion] First message sent (Prospect → 1st message)`,
        channel,
        createdAt: stamp,
      });
      emitted++;
    }

    // 4) Closed deals — emit closed_reason placeholder (just a marker, no content)
    if (
      (nextStatus === "Partnership" ||
        nextStatus === "Lost" ||
        nextStatus === "Closed without Partnership") &&
      prevStatus !== nextStatus
    ) {
      // Only emit a marker note — actual reason gets captured manually in /wins-losses
      await db.insert(schema.activities).values({
        contactId,
        type: "note",
        content: `[Inferred from Notion] Deal closed: ${nextStatus}. Add a reason in /wins-losses to track patterns.`,
        channel,
        createdAt: stamp,
      });
      emitted++;
    }
  }

  return emitted;
}
