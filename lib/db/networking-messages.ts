// Read + write helpers for networking_messages.

import { desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import type { NetworkingMessage, NewNetworkingMessage } from "./schema";

export async function getMessagesForContact(contactId: string): Promise<NetworkingMessage[]> {
  return db
    .select()
    .from(schema.networkingMessages)
    .where(eq(schema.networkingMessages.contactId, contactId))
    .orderBy(desc(schema.networkingMessages.createdAt));
}

export async function getLastMessageForContact(contactId: string): Promise<NetworkingMessage | null> {
  const rows = await db
    .select()
    .from(schema.networkingMessages)
    .where(eq(schema.networkingMessages.contactId, contactId))
    .orderBy(desc(schema.networkingMessages.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMessage(id: string): Promise<NetworkingMessage | null> {
  const rows = await db
    .select()
    .from(schema.networkingMessages)
    .where(eq(schema.networkingMessages.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createMessage(data: NewNetworkingMessage): Promise<NetworkingMessage> {
  const [row] = await db.insert(schema.networkingMessages).values(data).returning();
  return row;
}

export async function updateMessage(
  id: string,
  patch: Partial<NewNetworkingMessage>
): Promise<NetworkingMessage | null> {
  const [row] = await db
    .update(schema.networkingMessages)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.networkingMessages.id, id))
    .returning();
  return row ?? null;
}
