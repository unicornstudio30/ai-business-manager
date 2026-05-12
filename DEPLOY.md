# Deploy to Vercel — Step by Step

End state: `https://unicorn-manager.vercel.app` (or your domain) with HTTP basic auth, hosted Turso database, Notion sync, and Claude Code slash commands hitting the live API.

Estimated time: **~15 minutes** (one-time).

---

## 1. Create Turso database (free tier — ~2 min)

1. Sign up at https://app.turso.tech.
2. Create a new database — name it `unicorn-manager`. Pick the region closest to you.
3. Open the database, click **Generate Token**.
4. Save these two values:
   - `TURSO_DATABASE_URL` — `libsql://unicorn-manager-yourorg.turso.io`
   - `TURSO_AUTH_TOKEN` — `eyJhbGc...`

Free tier: 1B reads/mo, 25M writes/mo, 9GB storage.

## 2. Run migrations against Turso (~1 min)

```bash
echo "TURSO_DATABASE_URL=libsql://..." >> .env.local
echo "TURSO_AUTH_TOKEN=eyJhbGc..."     >> .env.local
npx drizzle-kit migrate
```

Should print `✓ migrations applied successfully!`.

## 3. Notion integration (~3 min)

1. https://www.notion.so/profile/integrations → **+ New integration** → name it `Unicorn Studio Manager` → submit.
2. Copy the **Internal Integration Token** (`ntn_...`). This is `NOTION_TOKEN`.
3. **Share each of the 3 databases with the integration** (this step is required — without it sync returns 404):
   - Open **Unicorn Studio's Sales CRM** → click `···` (top-right) → **Add connections** → select your integration.
   - Repeat for **Unicorn Studio's Sales tracker** and **Unicorn Studio Content Calendar**.

## 4. Generate secrets

```bash
# CLAUDE_API_KEY — bearer for slash commands
openssl rand -hex 32

# APP_PASSWORD — your basic auth password
# Just pick something memorable (or use openssl rand -base64 16)
```

## 5. Push to GitHub

If the repo isn't already pushed:

```bash
git push origin main
```

## 6. Connect Vercel (~3 min)

1. https://vercel.com/new → import your `unicorn-manager` repo.
2. **Framework Preset**: Next.js (auto-detected).
3. **Environment Variables** — paste each:

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | from step 1 |
| `TURSO_AUTH_TOKEN` | from step 1 |
| `NOTION_TOKEN` | from step 3 |
| `APP_USERNAME` | `saidur` (or whatever you want) |
| `APP_PASSWORD` | from step 4 |
| `CLAUDE_API_KEY` | from step 4 |
| `APP_URL` | (skip for first deploy — leave blank, fill after deploy URL is known) |

4. Click **Deploy**.

## 7. Post-deploy

After Vercel gives you a URL (e.g. `https://unicorn-manager-abc123.vercel.app`):

1. Visit it. Browser prompts for username + password — enter what you set in step 4. Land on the dashboard.
2. Click **Sync Notion** in the top-right. Watch the per-entity progress.
3. Refresh — your contacts, content calendar, and tracker entries appear.

## 8. Wire local Claude Code to the hosted app

```bash
# .env.local — add/update these:
APP_URL=https://your-vercel-url.vercel.app
CLAUDE_API_KEY=<same value as on Vercel>
```

Now slash commands run from your local Claude Code but write to the hosted app:

- `/run-daily` — morning briefing
- `/scan-hot-leads` — comment drafts for hot leads
- `/audit https://example.com` — site audit + email
- `/triage` — stuck-deal follow-ups
- `/next-message <contact-id>` — next DM in sequence
- `/sync` — manual Notion sync

---

## Troubleshooting

**Build fails on Vercel with libsql error**: check `next.config.ts` has `serverExternalPackages: ["@libsql/client"]`. Already there.

**Sync returns `Could not find database with ID: ...`**: you skipped step 3.3 — the Notion databases haven't been shared with the integration. Open each in Notion → `···` → Add connections.

**Sync returns `NOTION_TOKEN not set`**: token not configured in Vercel env vars. Add it, redeploy.

**Sync times out**: shouldn't happen — the Sync button does per-entity calls each under 10s. If it does, check `/settings` → Sync log. Re-click Sync; it's idempotent (last-write-wins).

**Slash commands return `401 Authentication required`**: `CLAUDE_API_KEY` mismatch between `.env.local` and Vercel. Both must be the exact same string.

**Browser keeps prompting for password**: you typed the wrong username/password. Default username is `saidur` — set `APP_USERNAME` if you want different.

---

## Cost summary

| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby | $0/mo |
| Turso | Free | $0/mo |
| Notion | Free | $0 |
| **Total** | | **$0/mo** |
