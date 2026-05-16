// Aggregate project revenue (price + 12*monthlyRetainer) grouped by the
// content piece that sourced the original contact.
//
// chain: content_items <- contacts.sourceContentId <- projects.contactId

import { db, schema } from "./client";
import { sql } from "drizzle-orm";

export type SourceRevenueRow = {
  contentId: string | null;       // null bucket = unattributed
  contentTitle: string | null;
  contactCount: number;
  projectCount: number;
  totalPrice: number;             // one-time
  totalMonthlyRetainer: number;   // recurring (sum of project monthlyRetainer values)
};

export async function revenueBySource(): Promise<SourceRevenueRow[]> {
  // Pull projects with their contact's sourceContentId, then group in JS.
  // Simpler than a big SQL group-by, and our row counts are small (~100s).
  const rows = await db
    .select({
      projectId: schema.projects.id,
      price: schema.projects.price,
      retainer: schema.projects.monthlyRetainer,
      contactId: schema.projects.contactId,
      sourceContentId: schema.contacts.sourceContentId,
      sourceTitle: schema.contentItems.title,
    })
    .from(schema.projects)
    .leftJoin(schema.contacts, sql`${schema.projects.contactId} = ${schema.contacts.id}`)
    .leftJoin(schema.contentItems, sql`${schema.contacts.sourceContentId} = ${schema.contentItems.id}`);

  // Also pull contacts attributed to each source so we can show contact counts
  // (some contacts won't have projects yet)
  const contactRows = await db
    .select({
      contactId: schema.contacts.id,
      sourceContentId: schema.contacts.sourceContentId,
      sourceTitle: schema.contentItems.title,
    })
    .from(schema.contacts)
    .leftJoin(schema.contentItems, sql`${schema.contacts.sourceContentId} = ${schema.contentItems.id}`);

  type Bucket = SourceRevenueRow;
  const buckets = new Map<string, Bucket>();
  function bucketFor(contentId: string | null, contentTitle: string | null): Bucket {
    const key = contentId ?? "__none__";
    if (!buckets.has(key)) {
      buckets.set(key, {
        contentId,
        contentTitle,
        contactCount: 0,
        projectCount: 0,
        totalPrice: 0,
        totalMonthlyRetainer: 0,
      });
    }
    return buckets.get(key)!;
  }

  for (const c of contactRows) {
    const b = bucketFor(c.sourceContentId, c.sourceTitle ?? null);
    b.contactCount++;
  }
  for (const p of rows) {
    const b = bucketFor(p.sourceContentId ?? null, p.sourceTitle ?? null);
    b.projectCount++;
    b.totalPrice += p.price ?? 0;
    b.totalMonthlyRetainer += p.retainer ?? 0;
  }

  // Sort: highest realized revenue first, then unattributed last
  return Array.from(buckets.values()).sort((a, b) => {
    if (a.contentId === null) return 1;
    if (b.contentId === null) return -1;
    const aTotal = a.totalPrice + a.totalMonthlyRetainer * 12;
    const bTotal = b.totalPrice + b.totalMonthlyRetainer * 12;
    return bTotal - aTotal;
  });
}
