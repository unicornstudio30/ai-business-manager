
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { setupNotionCrmColumns } from "@/lib/notion/setup";

export async function POST() {
  const result = await setupNotionCrmColumns();
  if (result.error) return NextResponse.json({ ok: false, ...result }, { status: 500 });
  return NextResponse.json({ ok: true, ...result });
}
