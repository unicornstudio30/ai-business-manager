// Daily engagement queue CSV — who to engage with TODAY per platform.
// GET /api/engagement/queue-csv?platform=Linkedin (optional filter)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getEngagementQueueByPlatform } from "@/lib/db/engagement-queue";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const platformFilter = req.nextUrl.searchParams.get("platform");
  const data = await getEngagementQueueByPlatform();

  const platforms = platformFilter
    ? [platformFilter].filter((p) => data.byPlatform[p])
    : data.platformOrder;

  const header = [
    "Priority",
    "Name",
    "Platform",
    "Stage",
    "ICP Score",
    "Engage Touch",
    "Top 50",
    "Hot",
    "Relation",
    "Profile URL",
    "Notion URL",
  ];
  const lines: string[] = [header.map(esc).join(",")];

  for (const p of platforms) {
    for (const item of data.byPlatform[p]) {
      const c = item.contact;
      lines.push([
        item.priority,
        c.name,
        c.platform,
        c.status,
        item.icpScore,
        item.touchCount,
        item.isTop50 ? "yes" : "",
        item.isHot ? "yes" : "",
        item.relations.join("; "),
        item.profileUrl,
        item.notionUrl,
      ].map(esc).join(","));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const parts = ["engagement-queue"];
  if (platformFilter) parts.push(platformFilter.toLowerCase());
  parts.push(today);

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parts.join("-")}.csv"`,
    },
  });
}
