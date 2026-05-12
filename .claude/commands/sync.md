---
description: Trigger bidirectional Notion sync — pulls latest from CRM/Tracker/Content Calendar and pushes any local dirty rows.
allowed-tools: Bash
---

Trigger a full Notion sync and report results.

Use these shell vars (read from `.env.local`):
- `APP_URL` (default `http://localhost:3000`)
- `CLAUDE_API_KEY`

## Steps

1. On Hobby tier the sync runs per-entity to stay under the 10s function timeout. Loop over each entity:

```bash
for entity in contacts content_items tracker_entries; do
  curl -s -X POST "${APP_URL:-http://localhost:3000}/api/sync?entity=$entity" \
    -H "x-claude-api-key: ${CLAUDE_API_KEY}"
  echo
done
```

2. Parse each JSON response (`results` is an array of `{entity, pulled, pushed, error?}`).
3. Output a clean summary, one line per entity: `contacts: pulled X ↓, pushed Y ↑`.
4. If any entity has an `error`, show it (often `NOTION_TOKEN not set` — direct user to `/settings`).
5. If sync looks healthy, suggest the next useful action (`/run-daily`, `/scan-hot-leads`, etc.).
