// GET /api/content/recent
// Returns recent content items from the Notion Content Calendar for the
// log-activity modal's "From Content Calendar" dropdown. Each item exposes
// its platform statuses/publish dates so the modal can pre-fill the form.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { db, schema } from "@/lib/db/client";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const rows = await db
    .select({
      id: schema.contentItems.id,
      title: schema.contentItems.title,
      topics: schema.contentItems.topics,
      type: schema.contentItems.type,
      personName: schema.contentItems.personName,
      linkedinStatus: schema.contentItems.linkedinStatus,
      xStatus: schema.contentItems.xStatus,
      facebookStatus: schema.contentItems.facebookStatus,
      linkedinPublishDate: schema.contentItems.linkedinPublishDate,
      xPublishDate: schema.contentItems.xPublishDate,
      facebookPublishDate: schema.contentItems.facebookPublishDate,
      updatedAt: schema.contentItems.updatedAt,
    })
    .from(schema.contentItems)
    .orderBy(desc(schema.contentItems.updatedAt))
    .limit(80);

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    topics: r.topics,
    type: r.type,
    personName: r.personName,
    // Compact per-platform view: only the platforms that have anything set
    // (a status OR a publish date). Empty otherwise.
    platforms: [
      { key: "linkedin", label: "LinkedIn", status: r.linkedinStatus, publishDate: r.linkedinPublishDate?.toISOString() ?? null },
      { key: "x",        label: "X",        status: r.xStatus,        publishDate: r.xPublishDate?.toISOString() ?? null },
      { key: "facebook", label: "Facebook", status: r.facebookStatus, publishDate: r.facebookPublishDate?.toISOString() ?? null },
    ].filter((p) => p.status || p.publishDate),
    updatedAt: r.updatedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ items });
}
