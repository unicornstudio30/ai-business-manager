// One-shot migration: copy marketing_activities + marketing_weekly_targets
// from the AI Business Manager DB → the standalone Market or Die app.
//
// Prerequisites:
//   1. MoD app deployed (or running locally) with SESSION_SECRET + CLAUDE_API_KEY set.
//   2. Users created in MoD with the same email addresses as in this app —
//      the script matches users by email. Missing users are skipped and reported.
//   3. Set MARKET_OR_DIE_URL + CLAUDE_API_KEY in this app's .env.local.
//
// Idempotent: sets source="migrated:<localActivityId>" on activities so re-runs
// are no-ops. Targets are re-set (POST is upsert-y on the MoD side).
//
// Usage:
//   npx tsx scripts/migrate-marketing-to-mod.ts [--dry-run]

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db, schema } from "../lib/db/client";
import type { MoDUser } from "../lib/clients/market-or-die";

const DRY_RUN = process.argv.includes("--dry-run");

const MOD_URL = process.env.MARKET_OR_DIE_URL?.replace(/\/+$/, "");
const API_KEY = process.env.CLAUDE_API_KEY;

if (!MOD_URL) {
  console.error("MARKET_OR_DIE_URL not set — nothing to migrate to");
  process.exit(1);
}
if (!API_KEY) {
  console.error("CLAUDE_API_KEY not set");
  process.exit(1);
}

const headers = {
  "x-claude-api-key": API_KEY,
  "content-type": "application/json",
};

async function fetchMoDUsers(): Promise<MoDUser[]> {
  const res = await fetch(`${MOD_URL}/api/external/users`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch MoD users: ${res.status}`);
  const data = await res.json();
  return data.users || [];
}

async function main() {
  console.log(`Migrating to: ${MOD_URL}`);
  console.log(DRY_RUN ? "[DRY RUN — no writes]" : "[LIVE — writes will happen]");

  // 1. Fetch MoD users, index by email
  const modUsers = await fetchMoDUsers();
  const modByEmail = new Map(modUsers.map((u) => [u.email.toLowerCase(), u]));
  console.log(`\nMoD has ${modUsers.length} active users.`);

  // 2. Read local users → email lookup
  const localUsers = await db.select().from(schema.users);
  const localById = new Map(localUsers.map((u) => [u.id, u]));

  // 3. Read local activities
  const acts = await db.select().from(schema.marketingActivities);
  console.log(`Local has ${acts.length} marketing_activities rows to consider.`);

  let posted = 0;
  let skippedNoUser = 0;
  let skippedNoInsert = 0;
  const missingEmails = new Set<string>();

  for (const a of acts) {
    const localU = localById.get(a.userId);
    if (!localU) {
      skippedNoUser += 1;
      continue;
    }
    const modU = modByEmail.get(localU.email.toLowerCase());
    if (!modU) {
      missingEmails.add(localU.email);
      skippedNoUser += 1;
      continue;
    }

    // Prefer existing source key (auto-imported rows already have one);
    // for manual rows stamp `migrated:<localId>` so re-runs are idempotent.
    const source = a.source || `migrated:${a.id}`;

    if (DRY_RUN) {
      posted += 1;
      continue;
    }

    const res = await fetch(`${MOD_URL}/api/external/activities`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: modU.id,
        platform: a.platform,
        kind: a.kind,
        count: a.count,
        notes: a.notes,
        weekStart: a.weekStart,
        source,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.inserted) posted += 1;
    else if (res.ok && !data.inserted) skippedNoInsert += 1;
    else {
      console.error(`POST failed for activity ${a.id}: ${data?.error || res.status}`);
    }
  }

  // 4. Read + post targets
  const targets = await db.select().from(schema.marketingWeeklyTargets);
  console.log(`\nLocal has ${targets.length} target overrides.`);

  let postedTargets = 0;
  let failedTargets = 0;
  for (const t of targets) {
    const localU = localById.get(t.userId);
    if (!localU) continue;
    const modU = modByEmail.get(localU.email.toLowerCase());
    if (!modU) continue;
    if (DRY_RUN) {
      postedTargets += 1;
      continue;
    }
    const res = await fetch(`${MOD_URL}/api/external/targets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: modU.id,
        weekStart: t.weekStart,
        targetPoints: t.targetPoints,
        setBy: "migration",
      }),
    });
    if (res.ok) postedTargets += 1;
    else {
      failedTargets += 1;
      const data = await res.json().catch(() => ({}));
      console.error(`Target POST failed for ${localU.email}@${t.weekStart}: ${data?.error || res.status}`);
    }
  }

  console.log(`\n────── Summary ──────`);
  console.log(`Activities posted:   ${posted}`);
  console.log(`Activities skipped (no matching user): ${skippedNoUser}`);
  console.log(`Activities skipped (already exist in MoD): ${skippedNoInsert}`);
  console.log(`Targets migrated:    ${postedTargets}`);
  if (failedTargets) console.log(`Targets failed:      ${failedTargets}`);
  if (missingEmails.size) {
    console.log(`\nMissing MoD users (create them first, then re-run):`);
    for (const e of missingEmails) console.log(`  - ${e}`);
  }
  if (DRY_RUN) {
    console.log(`\n(Dry run — no writes performed. Re-run without --dry-run to apply.)`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
