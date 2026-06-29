// User-table queries. All auth flows (login, signup, admin panel, MCP tools)
// go through these so password-hash + role-rank logic is centralised.

import { eq, desc, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { User, NewUser, UserRole } from "../db/schema";
import { hashPassword, verifyPassword } from "./passwords";

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listUsers(): Promise<User[]> {
  return db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
}

export async function countUsers(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);
  return Number(row?.count ?? 0);
}

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const role: UserRole = input.role ?? "salesperson";
  const [row] = await db
    .insert(schema.users)
    .values({
      email,
      name: input.name?.trim() || email.split("@")[0],
      passwordHash,
      role,
      active: 1,
    })
    .returning();
  return row;
}

export async function updateUserRole(id: string, role: UserRole): Promise<User | null> {
  const [row] = await db
    .update(schema.users)
    .set({ role })
    .where(eq(schema.users.id, id))
    .returning();
  return row ?? null;
}

export async function setUserActive(id: string, active: boolean): Promise<User | null> {
  const [row] = await db
    .update(schema.users)
    .set({ active: active ? 1 : 0 })
    .where(eq(schema.users.id, id))
    .returning();
  return row ?? null;
}

export async function updateUserPassword(id: string, newPassword: string): Promise<User | null> {
  const passwordHash = await hashPassword(newPassword);
  const [row] = await db
    .update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, id))
    .returning();
  return row ?? null;
}

// Set/clear the optional Notion Person mapping. Used by Market or Die
// auto-sync to attribute CRM activity to the right teammate when Notion's
// person display name differs from the app's user display name.
export async function updateUserNotionPerson(id: string, notionPerson: string | null): Promise<User | null> {
  const cleaned = notionPerson?.trim() || null;
  const [row] = await db
    .update(schema.users)
    .set({ notionPerson: cleaned })
    .where(eq(schema.users.id, id))
    .returning();
  return row ?? null;
}

export async function recordLogin(id: string): Promise<void> {
  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, id));
}

export async function deleteUser(id: string): Promise<boolean> {
  const res = await db.delete(schema.users).where(eq(schema.users.id, id)).returning({ id: schema.users.id });
  return res.length > 0;
}

// On a freshly-seeded DB, bootstrap the existing env-based credentials
// (AUTH_EMAIL + AUTH_PASSWORD) as the workspace owner. Idempotent — returns
// null when users already exist or when env credentials aren't set.
export async function bootstrapOwnerFromEnv(): Promise<User | null> {
  const email = process.env.AUTH_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_PASSWORD;
  if (!email || !password) return null;
  if ((await countUsers()) > 0) return null;
  return createUser({
    email,
    password,
    name: email.split("@")[0],
    role: "owner",
  });
}

// Verify credentials. On first call (no users in DB), bootstrap the env
// credentials as the owner so the user isn't locked out during the env →
// DB migration.
export async function authenticate(email: string, password: string): Promise<User | null> {
  if (!email || !password) return null;
  let user = await findUserByEmail(email);

  // Bootstrap path — let the env-configured owner sign in even on a fresh DB.
  if (!user && (await countUsers()) === 0) {
    await bootstrapOwnerFromEnv();
    user = await findUserByEmail(email);
  }

  if (!user) return null;
  if (!user.active) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  await recordLogin(user.id);
  return user;
}
