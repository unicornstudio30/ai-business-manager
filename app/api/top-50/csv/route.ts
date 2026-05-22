// Top 50 contacts CSV download. Optional ?platform=linkedin etc.
//
// GET /api/top-50/csv              → all Top 50 contacts
// GET /api/top-50/csv?platform=X   → Top 50 filtered to that Notion Platform value
//
// CSV columns: Name, Platform, Country, Status, Email, Contact URL,
//              Website, Position, Profession, Relation, ICP Score,
//              Last Touch, Notion URL.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db/client";
import { eq, and, desc } from "drizzle-orm";
import { computeIcpScore } from "@/lib/icp-scoring";
import { parseJson } from "@/lib/utils";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

function fmt(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");

  const where = platform
    ? and(eq(schema.contacts.top50, 1), eq(schema.contacts.platform, platform))
    : eq(schema.contacts.top50, 1);

  const rows = await db
    .select()
    .from(schema.contacts)
    .where(where)
    .orderBy(desc(schema.contacts.statusDate));

  const header = [
    "Name",
    "Platform",
    "Country",
    "Status",
    "Email",
    "Contact URL",
    "Website",
    "Position",
    "Profession",
    "Relation",
    "Connection type",
    "ICP Score",
    "Last Touch",
    "Notion URL",
  ];

  const lines: string[] = [toCsvRow(header)];

  for (const c of rows) {
    const icp = computeIcpScore(c).score;
    const positions = parseJson<string[]>(c.position, []).join("; ");
    const professions = parseJson<string[]>(c.profession, []).join("; ");
    const relations = parseJson<string[]>(c.relation, []).join("; ");
    const notionUrl = c.notionPageId
      ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`
      : "";
    lines.push(
      toCsvRow([
        c.name,
        c.platform,
        c.country,
        c.status,
        c.email,
        c.contactUrl,
        c.websiteUrl,
        positions,
        professions,
        relations,
        c.connectionType,
        icp,
        fmt(c.lastTouchAt ?? c.statusDate),
        notionUrl,
      ])
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const filenamePlatform = platform ? `-${platform.toLowerCase()}` : "";
  const filename = `top-50${filenamePlatform}-${today}.csv`;

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
