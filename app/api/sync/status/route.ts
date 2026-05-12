
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { syncStatus } from "@/lib/notion/sync";

export async function GET() {
  const status = await syncStatus();
  return NextResponse.json(status);
}
