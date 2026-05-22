export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { incrementMetric } from "@/lib/db/daily-kpi-helpers";

const PLATFORMS = ["linkedin", "x", "instagram", "facebook", "reddit", "email"] as const;
const ACTIONS = ["dm", "connect", "comment", "follow_up", "inmail"] as const;

const Schema = z.object({
  platform: z.enum(PLATFORMS),
  action: z.enum(ACTIONS),
  by: z.number().int().optional(),    // default 1; negative decrements
});

// POST /api/daily-sales/increment  body: { platform, action, by? }
// 1-tap +1 endpoint. Writes today's row, increments breakdown[platform][action].
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.format() }, { status: 400 });
  }
  const { breakdown } = await incrementMetric({
    platform: parsed.data.platform,
    action: parsed.data.action,
    by: parsed.data.by ?? 1,
  });
  return NextResponse.json({ ok: true, breakdown });
}
