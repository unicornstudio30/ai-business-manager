// POST /api/auth/login
// Body: { email, password }
// On success: sets the session cookie and returns { ok: true, user }.
//
// On a freshly-seeded database, AUTH_EMAIL + AUTH_PASSWORD env credentials are
// auto-promoted to the workspace owner on first successful login. After that
// all auth is DB-backed.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authConfigured, createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { authenticate } from "@/lib/auth/users";

export async function POST(req: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "Auth not configured (set AUTH_SECRET in env)" },
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

  const user = await authenticate(email, password);
  if (!user) {
    // Generic message — don't leak which half (email vs password) was wrong.
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role as any,
  });
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
