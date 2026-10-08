// Reporting filter: only contacts that still exist in the Notion CRM.
// Rows Notion no longer returns are flagged in_notion = 0 by the sync (never
// deleted) and must not count in any report.

import { eq } from "drizzle-orm";
import { schema } from "./client";

export const IN_NOTION = eq(schema.contacts.inNotion, 1);
