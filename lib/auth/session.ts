// Multi-user auth using a signed JWT in an httpOnly cookie.
//
// Token carries the user's id, email, and role so middleware (Edge runtime)
// can do route guards without hitting the database. AUTH_SECRET is the HMAC
// signing key. Stays env-only because middleware can't read the DB on Edge.
//
// User records live in the `users` table (lib/db/schema.ts). See lib/auth/users.ts
// for the DB queries (login, signup, role changes, etc.).
//
// Edge-compatible: jose's Web Crypto build works in middleware.

import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../db/schema";

const SESSION_COOKIE = "ubm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;     // 30 days

export const AUTH_COOKIE_NAME = SESSION_COOKIE;

export function authConfigured(): boolean {
  // We need AUTH_SECRET to sign sessions. AUTH_EMAIL + AUTH_PASSWORD are
  // optional — used only to bootstrap the first owner from env on a fresh DB.
  return !!process.env.AUTH_SECRET;
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET not set or too short (need 16+ chars)");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

export async function createSessionToken(input: {
  userId: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ userId: input.userId, email: input.email, role: input.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .setSubject(input.userId)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    if (typeof payload.email !== "string") return null;
    if (typeof payload.role !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function clearedCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}
