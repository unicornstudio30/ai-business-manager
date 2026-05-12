import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local first (gitignored, has real secrets), then .env as fallback.
config({ path: ".env.local" });
config({ path: ".env" });

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

export default {
  schema: "./lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "turso",
  dbCredentials: TURSO_URL
    ? { url: TURSO_URL, authToken: TURSO_TOKEN }
    : { url: "file:./data/app.db" },
} satisfies Config;
