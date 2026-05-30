// POST /api/networking/sync — pull all PRM contacts from Notion.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncPrmFromNotion } from "@/lib/notion/prm-sync";

export async function POST() {
  const result = await syncPrmFromNotion();
  if (result.error && result.pulled === 0) {
    return NextResponse.json(result, { status: 400 });
  }
  revalidatePath("/networking");
  return NextResponse.json(result);
}
