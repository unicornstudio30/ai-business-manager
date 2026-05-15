
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getKpiByDate, suggestedCountsForDate, upsertKpi } from "@/lib/db/daily-kpis";
import { z } from "zod";

export async function GET() {
  const today = new Date();
  const [row, suggested] = await Promise.all([getKpiByDate(today), suggestedCountsForDate(today)]);
  return NextResponse.json({ today: row, suggested });
}

const PatchSchema = z.object({
  coldDmsSent: z.number().int().optional(),
  coldEmailsSent: z.number().int().optional(),
  followUpsSent: z.number().int().optional(),
  warmDmsSent: z.number().int().optional(),
  responses: z.number().int().optional(),
  callsBooked: z.number().int().optional(),
  commentsOnProspects: z.number().int().optional(),
  newProspects: z.number().int().optional(),
  inboundLeads: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const today = new Date();
  const row = await upsertKpi(today, parsed.data);
  return NextResponse.json(row);
}
