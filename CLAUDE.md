# Unicorn Studio — AI Business Manager

This is Saidur's unified business OS for Unicorn Studio (AI automation, integrations, SaaS, websites, branding for AI SaaS founders).

## What you're working with

- **Web app**: Next.js 15. Base URL comes from the `APP_URL` env var in `.env.local`. Default is `http://localhost:3000` for local dev; in production it's the Vercel URL (e.g. `https://unicorn-manager.vercel.app`).
- **Database**: libsql (Turso in prod, local file in dev). Schema in `lib/db/schema.ts`. 14 tables.
- **Notion mirror**: 3 of the 14 tables (`contacts`, `tracker_entries`, `content_items`) sync with Notion. Notion is canonical for these. Edits in either Notion or the web app sync bidirectionally.
- **AI commands**: This Claude Code window is the cockpit. Slash commands live in `.claude/commands/*.md`.

## API auth (production only)

In production, all `/api/*` routes are protected. Slash commands authenticate by sending an `x-claude-api-key` header with the value of `CLAUDE_API_KEY` from `.env.local`. Locally this header is optional. Pattern:

```bash
curl -s "$APP_URL/api/briefing" -H "x-claude-api-key: $CLAUDE_API_KEY"
```

If `APP_URL` or `CLAUDE_API_KEY` are unset, default to `http://localhost:3000` and omit the header.

## Critical conventions

1. **Always sync before reading Notion-backed data.** Call `POST /api/sync` first when commands need fresh CRM / content / tracker data.
2. **Never invent Notion page IDs.** The DB IDs are in `lib/notion/client.ts`. Per-contact IDs come from `GET /api/contacts/[id]`.
3. **Use strategy docs as voice/framework reference.** Read `/strategy/unicorn-*.md` FIRST for tone & targeting, then `/strategy/appsmove-*.md` for mechanism (ACA, hook system, 5-part story).
4. **Write drafts to `/api/activities`.** This is the "Recent Activities" feed on each contact's page — the screen Saidur reviews drafts from.
5. **Use the 18-stage pipeline from `lib/stages.ts`.** Stage names are canonical (e.g., "Proposal Sent", "Post Proposal Follow-up-1"). Don't paraphrase.
6. **Use the DM sequence engine from `lib/sequences.ts`.** 7 steps for LinkedIn, 8 for Facebook. `nextStep()` tells you what to draft next.

## Key files

- `lib/db/schema.ts` — all 14 tables
- `lib/stages.ts` — 18-stage CRM pipeline + dashboard groupings
- `lib/sequences.ts` — DM sequence templates per platform
- `lib/positioning.ts` — Unicorn Studio offer summary
- `lib/notion/sync.ts` — bidirectional sync engine
- `app/contacts/[id]/page.tsx` — contact detail + Activities feed (the read-out screen)
- `strategy/` — strategy docs Claude reads for tone

## API quick reference

- `GET /api/briefing` — aggregated daily briefing data (use for `/run-daily`)
- `GET /api/contacts?status=&platform=&search=`
- `GET /api/contacts/[id]` — contact + last 50 activities
- `GET /api/contacts/hot-leads?limit=20`
- `GET /api/contacts/needs-follow-up?days=11&limit=20`
- `GET /api/contacts/by-stage` — counts grouped by dashboard group
- `POST /api/contacts` — create
- `PATCH /api/contacts/[id]` — partial update (any edit marks dirty=1 → auto-pushes to Notion)
- `POST /api/activities` — write a draft for a contact (this is the main write path for slash commands)
- `POST /api/sync` — trigger full bidirectional Notion sync

## Voice for drafts

Write as Saidur Rahaman, founder of Unicorn Studio. Tone: confident, specific, never salesy. Lead with the prospect's situation, not the offer. Always use ACA (Acknowledge → Compliment → Ask). Never pitch in the first message of a sequence — earn the conversation first. Reference custom-built (vs template) as the key differentiator. Mention the 3–4 clients/month capacity cap when it strengthens credibility.

## Notion setup status

If `GET /api/sync/status` returns `{configured: false}`, the user hasn't set up `NOTION_TOKEN` yet. Tell them to follow the steps in `/settings` and skip the sync step until they do — work with whatever local data exists.
