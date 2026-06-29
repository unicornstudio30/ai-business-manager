// POST /api/admin/users/create
// Body: { email, name?, role, password? }
//
// Create a new workspace user directly from the admin panel (no signup link
// or email invitation needed). If `password` is omitted, the server generates
// a strong one and returns it ONCE in the response so the caller can share it.
//
// Permission rules:
//   - Owner can create any role (including another owner).
//   - Admin can create salesperson | viewer only.
//   - Anyone below admin can't reach this endpoint (middleware blocks /admin/*).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createUser, findUserByEmail } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";
import type { UserRole } from "@/lib/db/schema";
import crypto from "node:crypto";

const VALID_ROLES = new Set<UserRole>(["owner", "admin", "salesperson", "viewer"]);

// Generates a 16-char URL-safe password. Avoids ambiguous chars (0/O, 1/l/I).
function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = crypto.randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (typeof body?.email === "string" ? body.email : "").trim().toLowerCase();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const role = typeof body?.role === "string" ? body.role : "";
  const requestedPassword = typeof body?.password === "string" ? body.password : "";

  // Validate inputs
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!VALID_ROLES.has(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (requestedPassword && requestedPassword.length < 8) {
    return NextResponse.json({ error: "Password must be 8+ characters" }, { status: 400 });
  }

  // Permission: only owner can create owner OR admin
  if ((role === "owner" || role === "admin") && me.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can create another owner or admin" },
      { status: 403 }
    );
  }

  // Uniqueness
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Use provided password OR generate one we return in the response
  const generated = !requestedPassword;
  const password = requestedPassword || generatePassword();

  const user = await createUser({ email, password, name, role: role as UserRole });

  revalidatePath("/admin/users");
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: !!user.active,
    },
    // Return the password ONLY if we generated it — the caller never sees a
    // user-provided password echoed back.
    initialPassword: generated ? password : null,
    note: generated
      ? "Password generated on the server. Share it with the new user securely; it won't be retrievable again."
      : "Share the password you set with the new user.",
  });
}
