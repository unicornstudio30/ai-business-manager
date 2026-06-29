// POST /api/auth/signup
// Body: { email, password, name? }
//
// Creates a new user with role="salesperson" by default. An owner / admin
// must then promote them through /admin/users if you want them to have
// more access. First-ever signup is auto-promoted to owner.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authConfigured, createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { countUsers, createUser, findUserByEmail } from "@/lib/auth/users";

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

  const email = (typeof body?.email === "string" ? body.email : "").trim().toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    // Generic error — don't reveal whether an email is registered.
    return NextResponse.json({ error: "Could not create account" }, { status: 409 });
  }

  // First user becomes the workspace owner. Subsequent signups default to salesperson.
  const total = await countUsers();
  const role = total === 0 ? "owner" as const : "salesperson" as const;

  const user = await createUser({ email, password, name, role });

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
