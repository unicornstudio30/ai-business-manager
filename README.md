# Unicorn Studio — AI Business Manager

Local-first business OS for Unicorn Studio: a Next.js dashboard that mirrors your 3 Notion databases (Sales CRM, Sales Tracker, Content Calendar), adds projects/audits/finance/activities tables Notion can't host, and is driven by Claude Code slash commands.

## What it does

- **Dashboard**: total contacts, hot leads, active clients, need-follow-up. By-stage breakdown across your 18-stage pipeline.
- **Contacts**: CRM mirror with stage/platform/country filters. Each contact has a profile, DM Sequence widget (where they are in the 7-step LinkedIn / 8-step FB sequence), and a Recent Activities feed where Claude saves drafts.
- **Tracker / Content**: read views of your Notion sales tracker journal and content calendar.
- **Audits, Projects, Partners, Finance, Networking, Communities, Daily KPIs**: local-only tables for everything Notion doesn't store.

## Setup (5 minutes)

```bash
# Install
npm install --legacy-peer-deps

# Initialize the database
npm run db:migrate

# Copy env template and add your Notion token
cp .env.local.example .env.local
# Edit .env.local and paste your token

# Run
npm run dev
# Opens at http://localhost:3000
```

### Connect Notion (5-minute one-time setup)

1. Go to https://www.notion.so/profile/integrations → New integration → name it "Unicorn Studio Business Manager".
2. Copy the **Internal Integration Token** (`secret_...`).
3. Paste it into `.env.local` as `NOTION_TOKEN=secret_...`.
4. In Notion, open each of your 3 databases — **Sales CRM**, **Sales tracker**, **Content Calendar** — click `…` → **Add connections** → select your integration.
5. Restart `npm run dev` and click **Sync Notion** in the top-right.

The first sync pulls all your Notion rows into local SQLite. Subsequent syncs are bidirectional and incremental.

## Claude Code slash commands

In Claude Code, opened in this directory:

| Command | What it does |
|---|---|
| `/sync` | Trigger Notion sync (pull + push). |
| `/sync-strategy` | Pull Appsmove strategy docs from Google Drive into `/strategy/`. Run once after setup. |
| `/run-daily` | Morning briefing: pipeline snapshot, follow-ups due, top 3 priorities. |
| `/scan-hot-leads [--limit=N]` | For each hot lead, observe latest LinkedIn activity, draft an ACA comment, save to their Activities feed. |
| `/audit <url> [--contact-id=<id>]` | Audit a prospect's site, draft an ACA outreach email, save to `/audits` and (if linked) the contact's Activities. |
| `/triage [--stage=<stage>]` | Find stuck contacts (11+ days no movement), draft stage-appropriate ACA follow-ups. |
| `/next-message <contact-id>` | Draft the next message in a contact's DM sequence (7-step LinkedIn or 8-step FB). |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  You: edit in Notion (mobile + desktop)         │
│       OR edit in the web dashboard               │
│       OR run slash commands in Claude Code       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Next.js app (localhost:3000)                    │
│  ├─ /api/*         REST endpoints                │
│  ├─ Dashboard      Server components + Tailwind  │
│  └─ data/app.db    SQLite (14 tables)            │
└────────────────┬────────────────────────────────┘
                 │ syncs 3 of 14 tables with...
                 ▼
┌─────────────────────────────────────────────────┐
│  Notion (canonical for CRM, Tracker, Calendar)   │
│  Last-write-wins, debounced background push.     │
└─────────────────────────────────────────────────┘
```

## Tech

- Next.js 15 + TypeScript + Tailwind v3
- SQLite (better-sqlite3) + Drizzle ORM
- Notion SDK (`@notionhq/client`) for sync
- Claude Code with custom slash commands as the AI cockpit
- No Anthropic SDK in the app — all AI runs through Claude Code

## Strategy docs

Two layers in `/strategy/`:

**Layer 1: Unicorn-specific** (committed to the repo)
- `unicorn-positioning.md` — Unicorn Studio offer + ICP + voice
- `unicorn-sales-playbook.md` — ACA + 18-stage scripts + DM sequences
- `unicorn-content-pillars.md` — content angles for the AI SaaS audience

**Layer 2: Appsmove framework reference** (gitignored, sync via `/sync-strategy`)
- 5 Markdown files synced from your Google Drive Appsmove folder
- ACA, hook system, 5-part story, sprint cadence — the mechanism, not the targeting

Claude reads Unicorn docs first (canonical for targeting), then Appsmove docs (canonical for framework).

## File layout

```
.claude/commands/   slash commands
app/                Next.js routes (UI + API)
components/         React components (dashboard, contacts, sync button, sidebar)
lib/                db, stages, sequences, positioning, notion sync
db/migrations/      Drizzle migrations
strategy/           strategy docs (unicorn-* committed; appsmove-* synced)
data/app.db         local SQLite (gitignored)
```

## Backup

Just copy `data/app.db`. It's a single file containing everything local. Notion-mirrored data lives in Notion as the source of truth.
