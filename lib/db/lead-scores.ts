// Lead score recompute + cache helpers.
// Called on activity insert and via the /api/lead-scores endpoint.

import { db, schema } from "./client";
import { eq } from "drizzle-orm";
import { computeLeadScore, type LeadScoreBreakdown } from "../lead-scoring";

export async function recomputeOne(contactId: string): Promise<LeadScoreBreakdown | null> {
  const contact = (
    await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId)).limit(1)
  )[0];
  if (!contact) return null;

  const activities = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.contactId, contactId));

  const ordered = activities.sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
  );
  const result = computeLeadScore(contact, ordered);

  await db
    .insert(schema.leadScores)
    .values({
      contactId,
      score: result.score,
      stageWeight: result.stageWeight,
      recencyScore: result.recencyScore,
      engagementScore: result.engagementScore,
      replyScore: result.replyScore,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.leadScores.contactId,
      set: {
        score: result.score,
        stageWeight: result.stageWeight,
        recencyScore: result.recencyScore,
        engagementScore: result.engagementScore,
        replyScore: result.replyScore,
        updatedAt: new Date(),
      },
    });

  return result;
}

export async function recomputeAll(): Promise<number> {
  const allContacts = await db.select({ id: schema.contacts.id }).from(schema.contacts);
  for (const c of allContacts) {
    await recomputeOne(c.id);
  }
  return allContacts.length;
}

export async function getScoresMap(): Promise<Map<string, number>> {
  const rows = await db
    .select({ contactId: schema.leadScores.contactId, score: schema.leadScores.score })
    .from(schema.leadScores);
  return new Map(rows.map((r) => [r.contactId, r.score]));
}
