# Deploy to Vercel — Step by Step

End state: `https://unicorn-manager.vercel.app` (or your domain) with Google auth, hosted Turso database, Notion sync, and Claude Code slash commands hitting the live API.

Estimated time: **30–45 minutes** (one-time).

---

## 1. Create Turso database (free tier — ~2 min)

1. Sign up at https://app.turso.tech.
2. Create a new database — name it `unicorn-manager`. Pick the region closest to you.
3. Open the database, click **Generate Token**.
4. You now have two values to save:
   - `TURSO_DATABASE_URL` — looks like `libsql://unicorn-manager-yourorg.turso.io`
   - `TURSO_AUTH_TOKEN` — looks like `eyJhbGc...`

Free tier: 1B reads/mo, 25M writes/mo, 9GB storage. Plenty.

## 2. Run migrations against Turso (~1 min)

```bash
# In the project root, add the Turso creds to .env.local
echo "TURSO_DATABASE_URL=libsql://..." >> .env.local
echo "TURSO_AUTH_TOKEN=eyJhbGc..." >> .env.local

# Apply schema to Turso
npx drizzle-kit migrate
```

You should see `✓ migrations applied successfully!`.

## 3. Create Google OAuth credentials (~5 min)

1. Go to https://console.cloud.google.com → APIs & Services → Credentials.
2. Create a new project if you don't have one (name it `unicorn-manager`).
3. Click **Configure consent screen** → choose **External** → fill the form. App name: `Unicorn Studio Manager`. Add your email as support contact.
4. Back at Credentials → **Create Credentials** → **OAuth client ID** → **Web application**.
5. Set **Authorized redirect URIs**: temporarily put `http://localhost:3000/api/auth/callback/google` (we'll add the prod URL after Vercel deploy).
6. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 4. Generate secrets

```bash
# AUTH_SECRET — random string for NextAuth
openssl rand -base64 32

# CLAUDE_API_KEY — bearer for slash commands
openssl rand -hex 32
```

Save both.

## 5. Create Notion integration (~3 min)

1. https://www.notion.so/profile/integrations → **+ New integration** → name `Unicorn Studio Manager` → submit.
2. Copy the **Internal Integration Token** (`secret_...`). This is your `NOTION_TOKEN`.
3. In Notion, open each of the 3 databases:
   - **Unicorn Studio's Sales CRM**
   - **Unicorn Studio's Sales tracker**
   - **Unicorn Studio Content Calendar**

   For each, click `…` → **Add connections** → select your integration.

## 6. Push to GitHub (~2 min)

```bash
cd "/Users/saidurrahaman/Desktop/Projects/ai/AI Business Manager"
git init
git add .
git commit -m "Initial commit — Unicorn Studio AI Business Manager"

# Create the repo on github.com (private), then:
git remote add origin git@github.com:YOURUSER/unicorn-manager.git
git push -u origin main
```

## 7. Connect Vercel (~3 min)

1. https://vercel.com/new → import your `unicorn-manager` repo.
2. **Framework Preset**: Next.js (auto-detected).
3. **Root Directory**: leave as is.
4. **Build & Output Settings**: leave defaults.
5. **Environment Variables**: paste each of these (name → value):

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | from step 1 |
| `TURSO_AUTH_TOKEN` | from step 1 |
| `NOTION_TOKEN` | from step 5 |
| `AUTH_SECRET` | from step 4 |
| `AUTH_URL` | `https://<your-vercel-subdomain>.vercel.app` (you'll know it after first deploy) |
| `GOOGLE_CLIENT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 3 |
| `ALLOWED_EMAILS` | your Google email (comma-separated for multiple) |
| `CLAUDE_API_KEY` | from step 4 |

   > Note: skip `AUTH_URL` for the first deploy — Vercel auto-injects `VERCEL_URL`. Add it after you know your subdomain.

6. Click **Deploy**.

## 8. Complete Google OAuth setup

After Vercel gives you a URL (e.g. `https://unicorn-manager-abc123.vercel.app`):

1. Go back to Google Cloud Console → your OAuth client → **Authorized redirect URIs**.
2. Add: `https://<your-vercel-url>/api/auth/callback/google`.
3. Save.
4. Back in Vercel → Settings → Environment Variables → add `AUTH_URL=https://<your-vercel-url>` → redeploy.

## 9. Update `.env.local` for slash commands

Once your Vercel URL is live, point your local Claude Code at the hosted API:

```bash
# .env.local
APP_URL=https://your-vercel-url.vercel.app
CLAUDE_API_KEY=<same value as on Vercel>
```

Now slash commands run from your local Claude Code but hit the hosted app.

## 10. First sync + test (~2 min)

1. Visit your Vercel URL. Sign in with Google. Land on the dashboard.
2. Click **Sync Notion** in the top-right. Watch the per-entity progress.
3. Refresh — your contacts, content calendar, and tracker entries are now visible.
4. From Claude Code in this project, run `/run-daily`. You should get a Markdown briefing with real data.
5. Try `/scan-hot-leads --limit=3` — drafts appear in each contact's Activities feed.

---

## Troubleshooting

**Build fails on Vercel with libsql error**: ensure `next.config.ts` has `serverExternalPackages: ["@libsql/client"]`. It already does.

**Sign-in just redirects back to /login**: your email isn't in `ALLOWED_EMAILS`. Add it (comma-separated, lowercase) and redeploy.

**Sync button shows `NOTION_TOKEN not set`**: token not configured in Vercel env vars. Add it, redeploy.

**Sync times out**: shouldn't happen — the button does per-entity calls each under 10s. If it does, check `/settings` → Sync log for the failing batch. Re-click Sync; it's idempotent (last-write-wins).

**Slash commands return `Unauthorized`**: check `CLAUDE_API_KEY` matches between `.env.local` and Vercel. Both must be the exact same string.

**Google OAuth `redirect_uri_mismatch`**: the URL in Google Cloud Console doesn't match what NextAuth is sending. It must be exactly `https://<your-vercel-url>/api/auth/callback/google`.

---

## Cost summary

| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby | $0/mo |
| Turso | Free | $0/mo (up to 9GB, 1B reads/mo) |
| Notion | Free | $0 |
| Google Cloud OAuth | Free | $0 |
| **Total** | | **$0/mo** |

Upgrading to Vercel Pro ($20/mo) gets you 60s function timeouts (sync runs in one call) and Vercel Cron for scheduled auto-sync.
