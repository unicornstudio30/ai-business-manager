// Server-side helpers for reading the current session inside server
// components, route handlers, and server actions.

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";
import { findUserById } from "./users";
import type { User } from "../db/schema";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Returns the full user record from the DB (or null if the session is invalid
// or the user has been deleted/deactivated since the token was issued).
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user) return null;
  if (!user.active) return null;
  return user;
}
