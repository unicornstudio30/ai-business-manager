# Unicorn Studio — AI Business Manager

This is Saidur's unified business OS for Unicorn Studio (AI automation, integrations, SaaS, websites, branding for AI SaaS founders).

## What you're working with

- **Web app**: Next.js 15. Base URL comes from the `APP_URL` env var in `.env.local`. Default is `http://localhost:3000` for local dev; in production it's the Vercel URL (e.g. `https://unicorn-manager.vercel.app`).
- **Database**: libsql (Turso in prod, local file in dev). Schema in `lib/db/schema.ts`. 14 tables.
- **Notion mirror**: 3 of the 14 tables (`contacts`, `tracker_entries`, `content_items`) mirror Notion. Notion is canonical for these.
- **Read-only reporting layer**: PBM never writes to Notion. The Pipeline app (separate project) is the only automated writer of Stage (the Notion `Status` column) and owns the inbox, next action and drafts. Overlapping PBM features are switched off with flags in `lib/feature-flags.ts` (env `PBM_FLAG_<NAME>=on|off`), not deleted. Activity and leaderboard data in PBM's own DB is still written.
- **AI commands**: This Claude Code window is the cockpit. Slash commands live in `.claude/commands/*.md`.

## API auth (production only)

In production, all `/api/*` routes are protected. Slash commands authenticate by sending an `x-claude-api-key` header with the value of `CLAUDE_API_KEY` from `.env.local`. Locally this header is optional. Pattern:

```bash
curl -s "$APP_URL/api/briefing" -H "x-claude-api-key: $CLAUDE_API_KEY"
```

If `APP_URL` or `CLAUDE_API_KEY` are unset, default to `http://localhost:3000` and omit the header.

## Critical conventions

1. **Always sync before reading Notion-backed data.** Call `POST /api/sync` first when commands need fresh CRM / content / tracker data. Sync is pull-only.
2. **Never invent Notion page IDs.** The DB IDs are in `lib/notion/client.ts`. Per-contact IDs come from `GET /api/contacts/[id]`.
3. **Use strategy docs as voice/framework reference.** Read `/strategy/unicorn-*.md` FIRST for tone & targeting, then `/strategy/appsmove-*.md` for mechanism (ACA, hook system, 5-part story).
4. **Never write Stage.** Don't change a contact's Status from PBM, a slash command or an MCP tool. Contact create/edit/delete routes return 403 while PBM is read-only.
5. **Stages come from Notion.** `lib/notion/stage-source.ts` reads the CRM `Status` options at runtime (5-min cache); `stage_definitions` returns them. Group mapping (Cold/Engaged/Qualified/Proposal/Call/Won/Archive), reporting roles, points and stuck thresholds live in `lib/stage-config.ts` — the only file that names stages. A Notion stage with no group logs a warning; add it there.
6. **Per-seat reporting.** A seat is each distinct Notion `Person` value (`contacts.owner_name`). `lib/db/seats.ts` maps seats to users (exact, then fuzzy). Analytics, funnel, stuck deals and leaderboards take `?seat=` / `seat`.

## Key files

- `lib/db/schema.ts` — all 14 tables
- `lib/stage-config.ts` — stage → group mapping, roles, points, stuck thresholds
- `lib/notion/stage-source.ts` — live stage list from Notion
- `lib/stages.ts` — stage helpers derived from the config
- `lib/feature-flags.ts` — read-only mode flags
- `lib/db/seats.ts` — seats (Notion Person values) and seat → user mapping
- `lib/sequences.ts` — DM sequence templates (used only when NEXT_MESSAGE is on)
- `lib/positioning.ts` — Unicorn Studio offer summary
- `lib/notion/sync.ts` — sync engine (pull; push only when PBM_FLAG_NOTION_WRITES=on)
- `app/contacts/[id]/page.tsx` — contact detail + Activities feed (the read-out screen)
- `strategy/` — strategy docs Claude reads for tone

## API quick reference

- `GET /api/briefing` — aggregated daily briefing data (use for `/run-daily`)
- `GET /api/contacts?status=&platform=&search=`
- `GET /api/contacts/[id]` — contact + last 50 activities
- `GET /api/contacts/hot-leads?limit=20`
- `GET /api/contacts/needs-follow-up?days=11&limit=20` — 410 while FOLLOW_UP_QUEUES is off
- `GET /api/contacts/by-stage` — counts grouped by dashboard group
- `POST /api/contacts`, `PATCH|DELETE /api/contacts/[id]` — 403 while PBM is read-only
- `POST /api/activities` — write a draft for a contact (this is the main write path for slash commands)
- `POST /api/sync` — pull from Notion (read-only)

## Voice for drafts

Write as Saidur Rahaman, founder of Unicorn Studio. Tone: confident, specific, never salesy. Lead with the prospect's situation, not the offer. Always use ACA (Acknowledge → Compliment → Ask). Never pitch in the first message of a sequence — earn the conversation first. Reference custom-built (vs template) as the key differentiator. Mention the 3–4 clients/month capacity cap when it strengthens credibility.

## Notion setup status

If `GET /api/sync/status` returns `{configured: false}`, the user hasn't set up `NOTION_TOKEN` yet. Tell them to follow the steps in `/settings` and skip the sync step until they do — work with whatever local data exists.
