---
description: Scan recent posts from hot leads, draft ACA comments, save to their Activities feed. Optional --limit=N.
allowed-tools: Bash, WebFetch, Read
---

For each hot lead (stages: Lead, 1st/2nd Lead Follow up, Qualified, Proposal Sent, Post Proposal Follow-up-1/2, Booking, First call), observe their latest LinkedIn/X post and draft an ACA-style comment.

Use shell vars: `APP_URL`, `CLAUDE_API_KEY`.

## Steps

1. Read `strategy/unicorn-positioning.md`, `strategy/unicorn-sales-playbook.md`, then `strategy/appsmove-sales-scripts-aca.md` for the ACA framework.
2. Sync contacts:

```bash
curl -s -X POST "${APP_URL:-http://localhost:3000}/api/sync?entity=contacts" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}" > /dev/null
```

3. Fetch hot leads:

```bash
curl -s "${APP_URL:-http://localhost:3000}/api/contacts/hot-leads?limit=${LIMIT:-10}" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}"
```

4. For each contact:
   - If they have a `contactUrl` (LinkedIn or similar), WebFetch it. If blocked / 401, skip and note.
   - Identify their most recent post or activity signal.
   - POST a `post_observed` activity:

```bash
curl -s -X POST "${APP_URL:-http://localhost:3000}/api/activities" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contact_id":"<id>","type":"post_observed","content":"<3-sentence summary>","source_url":"<url>"}'
```

   - Draft a 3–5 sentence ACA comment as Saidur (Unicorn Studio founder):
     - **Acknowledge**: specific reference to what they posted
     - **Compliment**: tie to a positive trait — operational discipline, taste, clarity of thought
     - **Ask**: a sharp follow-up question (NOT a pitch) that opens space about AI/automation/their stack
   - POST a `comment_drafted` activity with that comment.

## Output

A table:

| Contact | Stage | Observed | Comment status |
|---|---|---|---|
| [Name](${APP_URL}/contacts/[id]) | Lead | Posted about scaling pains | ✅ Drafted |

End with: "Drafts live in each contact's Activities feed — open the link to copy."

## Important

- Never pitch in the comment. The goal is recognition + earning the next reply, not closing.
- If WebFetch fails for LinkedIn (very common — they block), don't fake an observation. Record `post_observed` as "WebFetch blocked — manual check needed" and skip the comment draft.
- Save EVERY draft via the API — the contact detail page is where Saidur reviews them.
