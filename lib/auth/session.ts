// Simple email + password auth using a signed JWT in an httpOnly cookie.
//
// Single-user setup — credentials live in env vars (AUTH_EMAIL, AUTH_PASSWORD).
// AUTH_SECRET is the HMAC key used to sign the session JWT.
//
// Edge-compatible (uses jose's Web Crypto build) so middleware can verify
// sessions without a Node runtime.

import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "ubm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;     // 30 days

export const AUTH_COOKIE_NAME = SESSION_COOKIE;

export function authEmail(): string | null {
  return process.env.AUTH_EMAIL?.trim().toLowerCase() || null;
}

export function authConfigured(): boolean {
  return !!process.env.AUTH_EMAIL && !!process.env.AUTH_PASSWORD && !!process.env.AUTH_SECRET;
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET not set or too short (need 16+ chars)");
  }
  return new TextEncoder().encode(s);
}

// Constant-time string compare. Avoids leaking timing info on wrong password.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.AUTH_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.AUTH_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  const emailOk = timingSafeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = timingSafeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

export type SessionPayload = {
  email: string;
  iat: number;
  exp: number;
};

export async function createSessionToken(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .setSubject(email)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.email || typeof payload.email !== "string") return null;
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
