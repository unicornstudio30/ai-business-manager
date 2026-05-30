// POST /api/networking/setup
// Body: { url: string }
// Takes the Notion PRM database URL the user pasted, extracts the database id,
// discovers the data source id via the Notion API (requires the integration to
// already be shared with the database), and persists the config.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  extractDatabaseId,
  discoverDataSourceId,
  savePrmConfig,
  getPrmConfig,
} from "@/lib/notion/prm-config";
import { isNotionConfigured } from "@/lib/notion/client";

export async function GET() {
  const cfg = await getPrmConfig();
  return NextResponse.json({ configured: !!cfg, ...cfg });
}

export async function POST(req: NextRequest) {
  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: "NOTION_TOKEN not set — set it up in /settings first" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const databaseId = extractDatabaseId(url);
  if (!databaseId) {
    return NextResponse.json(
      { error: "Could not extract a Notion database id from that URL" },
      { status: 400 }
    );
  }

  const dataSourceId = await discoverDataSourceId(databaseId);
  if (!dataSourceId) {
    return NextResponse.json(
      {
        error:
          "Connected to Notion but couldn't discover the data source — make sure your integration has access to this database (Open the DB → ⋯ → Add connections → Unicorn Studio Business Manager)",
      },
      { status: 400 }
    );
  }

  await savePrmConfig({ databaseId, dataSourceId, rawUrl: url });
  revalidatePath("/settings");
  revalidatePath("/networking");

  return NextResponse.json({ ok: true, databaseId, dataSourceId });
}
