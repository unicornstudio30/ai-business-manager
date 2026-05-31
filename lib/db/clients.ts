// Clients = contacts whose Status reached "Partnership" in the Sales CRM.
// Pure compute over the contacts table — no new state.

import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { db, schema } from "./client";
import type { Contact } from "./schema";
import { ACTIVE_CLIENT_STAGES } from "../stages";

const DAY = 86_400_000;

export type ClientHealth = "fresh" | "warm" | "cooling" | "cold" | "unknown";

export type ClientItem = {
  contact: Contact;
  daysAsClient: number | null;       // since statusDate
  daysSinceTouch: number | null;     // since lastTouchAt
  health: ClientHealth;              // green / amber / red
  notionUrl: string | null;
};

export type ClientsView = {
  items: ClientItem[];
  totals: {
    total: number;
    newLast30Days: number;
    needCheckIn: number;             // last touch 14-30d
    goingQuiet: number;              // last touch 30d+
    fresh: number;                   // last touch <14d
  };
};

function healthFor(daysSinceTouch: number | null): ClientHealth {
  if (daysSinceTouch === null) return "unknown";
  if (daysSinceTouch <= 14) return "fresh";
  if (daysSinceTouch <= 30) return "warm";
  if (daysSinceTouch <= 90) return "cooling";
  return "cold";
}

export async function getClientsView(search?: string): Promise<ClientsView> {
  const conds: any[] = [
    eq(schema.contacts.status, ACTIVE_CLIENT_STAGES[0]),
  ];
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    conds.push(like(sql`lower(${schema.contacts.name})`, q));
  }
  const rows = await db
    .select()
    .from(schema.contacts)
    .where(and(...conds))
    .orderBy(desc(schema.contacts.statusDate));

  const now = Date.now();
  const d30 = now - 30 * DAY;
  const items: ClientItem[] = rows.map((c) => {
    const daysAsClient = c.statusDate ? Math.floor((now - c.statusDate.getTime()) / DAY) : null;
    const daysSinceTouch = c.lastTouchAt ? Math.floor((now - c.lastTouchAt.getTime()) / DAY) : null;
    const notionUrl = c.notionPageId
      ? `https://www.notion.so/${c.notionPageId.replace(/-/g, "")}`
      : null;
    return {
      contact: c,
      daysAsClient,
      daysSinceTouch,
      health: healthFor(daysSinceTouch),
      notionUrl,
    };
  });

  const totals = {
    total: items.length,
    newLast30Days: items.filter((i) => i.contact.statusDate && i.contact.statusDate.getTime() >= d30).length,
    needCheckIn: items.filter((i) => i.health === "warm").length,
    goingQuiet: items.filter((i) => i.health === "cooling" || i.health === "cold").length,
    fresh: items.filter((i) => i.health === "fresh").length,
  };

  return { items, totals };
}
