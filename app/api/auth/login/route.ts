// POST /api/auth/login
// Body: { email, password }
// On success: sets the session cookie and returns { ok: true }.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authConfigured, createSessionToken, sessionCookieOptions, verifyCredentials } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "Auth not configured (set AUTH_EMAIL, AUTH_PASSWORD, AUTH_SECRET in env)" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!verifyCredentials(email, password)) {
    // Generic message — don't leak which half (email vs password) was wrong.
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSessionToken(email.trim().toLowerCase());
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
