// GET — return current outreach config (defaults + saved overrides).
// POST — replace the config with the body and save.
// Body shape mirrors OutreachConfig in lib/outreach-config.ts.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getOutreachConfig, saveOutreachConfig, type OutreachConfig } from "@/lib/outreach-config";
import { PLATFORM_LIMITS, type PlatformKey, type ActionKey } from "@/lib/sales-limits";

const VALID_PLATFORMS = new Set(Object.keys(PLATFORM_LIMITS));
const VALID_ACTIONS = new Set<ActionKey>(["dm", "connect", "comment", "follow_up", "inmail"]);

function sanitizeNumber(n: unknown, min: number, max: number): number | undefined {
  const v = typeof n === "string" ? Number(n) : (n as number);
  if (!Number.isFinite(v)) return undefined;
  if (v < min || v > max) return undefined;
  return Math.floor(v);
}

export async function GET() {
  const cfg = await getOutreachConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const startHour = sanitizeNumber(body?.activeWindow?.startHour, 0, 23) ?? 10;
  const endHourRaw = sanitizeNumber(body?.activeWindow?.endHour, 1, 24) ?? 23;
  // Ensure end > start
  const endHour = endHourRaw > startHour ? endHourRaw : Math.min(24, startHour + 1);

  const overrides: OutreachConfig["overrides"] = {};
  const rawOverrides = body?.overrides ?? {};
  for (const [pk, pVal] of Object.entries(rawOverrides)) {
    if (!VALID_PLATFORMS.has(pk)) continue;
    const platform = pk as PlatformKey;
    const platformOut: Record<string, any> = {};
    for (const [ak, aVal] of Object.entries(pVal as Record<string, any>)) {
      if (!VALID_ACTIONS.has(ak as ActionKey)) continue;
      const max = sanitizeNumber((aVal as any).max, 1, 10000);
      const perHour = sanitizeNumber((aVal as any).perHour, 1, 500);
      if (max === undefined && perHour === undefined) continue;
      platformOut[ak] = { ...(max !== undefined && { max }), ...(perHour !== undefined && { perHour }) };
    }
    if (Object.keys(platformOut).length > 0) {
      overrides[platform] = platformOut;
    }
  }

  const config: OutreachConfig = {
    activeWindow: { startHour, endHour },
    overrides,
  };
  await saveOutreachConfig(config);
  return NextResponse.json({ ok: true, config });
}
