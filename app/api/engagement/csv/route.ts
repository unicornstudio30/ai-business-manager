// Engagement contacts CSV download — filtered by platform and/or level.
//
// GET /api/engagement/csv                     → all active engagement contacts
// GET /api/engagement/csv?platform=Linkedin   → only LinkedIn
// GET /api/engagement/csv?level=highly_engaged → only highly engaged
// GET /api/engagement/csv?platform=X&level=touched → combined filter
//
// CSV columns: Name, Platform, Level, ICP, Stage, Engage Touch, Relation,
//              Email, Contact URL, Website, Last Touch, Notion URL.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getEngagementByPlatform, type EngagementLevel } from "@/lib/db/engagement-by-platform";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

function fmt(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

const LEVEL_LABEL: Record<EngagementLevel, string> = {
  highly_engaged: "Highly engaged",
  touched: "Touched",
  cold: "Cold",
};

export async function GET(req: NextRequest) {
  const platformFilter = req.nextUrl.searchParams.get("platform");
  const levelFilter = req.nextUrl.searchParams.get("level") as EngagementLevel | null;

  const data = await getEngagementByPlatform();

  // Collect all matching contacts
  let items = Object.entries(data.byPlatform).flatMap(([platform, contacts]) =>
    contacts.map((c) => ({ ...c, platform }))
  );
  if (platformFilter) {
    items = items.filter((i) => i.platform === platformFilter);
  }
  if (levelFilter) {
    items = items.filter((i) => i.level === levelFilter);
  }

  const header = [
    "Name",
    "Platform",
    "Engagement Level",
    "ICP Score",
    "Stage",
    "Engage Touch",
    "Relation",
    "Email",
    "Contact URL",
    "Website",
    "Last Touch",
    "Notion URL",
  ];
  const lines: string[] = [toRow(header)];

  for (const i of items) {
    const c = i.contact;
    const notionUrl = c.notionPageId
      ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`
      : "";
    lines.push(
      toRow([
        c.name,
        c.platform,
        LEVEL_LABEL[i.level],
        i.icpScore,
        c.status,
        i.touchCount,
        i.relations.join("; "),
        c.email,
        c.contactUrl,
        c.websiteUrl,
        fmt(i.lastTouchAt),
        notionUrl,
      ])
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const parts = ["engagement"];
  if (platformFilter) parts.push(platformFilter.toLowerCase());
  if (levelFilter) parts.push(levelFilter);
  parts.push(today);
  const filename = `${parts.join("-")}.csv`;

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
