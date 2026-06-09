// Server-side helpers for reading the current session inside server
// components, route handlers, and server actions.

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";

export async function getCurrentUser(): Promise<{ email: string } | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return { email: session.email };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
