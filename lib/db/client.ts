import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// Two modes:
// - Local dev: file://./data/app.db (created on disk)
// - Production (Vercel + Turso): libsql://your-db.turso.io with TURSO_AUTH_TOKEN
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let url: string;
let authToken: string | undefined;

if (TURSO_URL) {
  url = TURSO_URL;
  authToken = TURSO_TOKEN;
} else {
  // Local file-based libsql
  const DB_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  url = `file:${path.join(DB_DIR, "app.db")}`;
}

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
export { schema };
