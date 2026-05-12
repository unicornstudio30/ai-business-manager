import type { Config } from "drizzle-kit";
import "dotenv/config";

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
