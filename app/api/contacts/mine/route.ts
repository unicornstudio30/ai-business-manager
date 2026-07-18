// GET /api/contacts/mine
// Returns CRM contacts owned by the current user (via the same fuzzy
// resolver Sell or Die uses). Feeds the "For which lead?" dropdown in the
// Sell or Die log-stage modal.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { db, schema } from "@/lib/db/client";
import { resolveOwnerName } from "@/lib/name-matcher";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  // Users list for fuzzy resolution (same as auto-sync)
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      notionPerson: schema.users.notionPerson,
    })
    .from(schema.users)
    .where(eq(schema.users.active, 1));

  const contacts = await db
    .select({
      id: schema.contacts.id,
      name: schema.contacts.name,
      status: schema.contacts.status,
      platform: schema.contacts.platform,
      ownerName: schema.contacts.ownerName,
      statusDate: schema.contacts.statusDate,
      updatedAt: schema.contacts.updatedAt,
    })
    .from(schema.contacts)
    .where(and(isNotNull(schema.contacts.ownerName), ne(schema.contacts.ownerName, "")))
    .orderBy(desc(schema.contacts.updatedAt))
    .limit(500);

  const mine = contacts.filter((c) => {
    const match = resolveOwnerName(c.ownerName, users);
    return match?.user.id === me.id;
  });

  return NextResponse.json({
    items: mine.map((c) => ({
      id: c.id,
      name: c.name || "(no name)",
      status: c.status,
      platform: c.platform,
      updatedAt: c.updatedAt?.toISOString() ?? null,
    })),
  });
}
