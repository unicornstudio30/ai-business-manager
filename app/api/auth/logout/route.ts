// POST /api/auth/logout — clears the session cookie.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearedCookieOptions } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...clearedCookieOptions(), value: "" });
  return res;
}
