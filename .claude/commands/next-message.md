---
description: Draft the next message in a contact's DM sequence (7-step LinkedIn or 8-step Facebook). Usage /next-message <contact-id>
allowed-tools: Bash, Read
---

For a single contact, look up their current step in the DM sequence and draft the next one with full context.

Use shell vars: `APP_URL`, `CLAUDE_API_KEY`.

## Steps

1. Read `strategy/unicorn-positioning.md` and `strategy/unicorn-sales-playbook.md` for tone and sequence templates. Also read `strategy/appsmove-sales-scripts-aca.md`.
2. Read `lib/sequences.ts` to see the exact 7-step LinkedIn and 8-step Facebook templates.
3. Fetch the contact:

```bash
curl -s "${APP_URL:-http://localhost:3000}/api/contacts/<contact-id>" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}"
```

This returns `{ contact, activities }`.

4. Determine:
   - `track` = `linkedin` or `facebook` (from `contact.platform` / `contact.sequenceTrack`)
   - `current step` = `contact.engageTouch ?? 0`
   - `last touch` = `contact.lastTouchAt` (compare to step's `dayOffsetFromPrev` — flag if too soon or overdue)
5. Look up the next step from the sequences module (step `current + 1`).
6. Draft a message **matching the next step's `promptHint`** using ACA, voiced as Saidur (Unicorn Studio founder).
7. POST it as a `dm_sent` activity (status: draft):

```bash
curl -s -X POST "${APP_URL:-http://localhost:3000}/api/activities" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contact_id":"<id>","type":"dm_sent","content":"<draft>"}'
```

## Output

```
# Next message for <Name>

**Sequence**: <track> · **Current step**: <n>/<total> · **Last touch**: <date> (<days ago>)

## Step <n+1>: <brief>
Channel: <channel> · Target status after sending: <targetStatus>

[If days since last touch < step's dayOffsetFromPrev:]
⚠️ Too soon — sequence calls for Day +<N> from last touch (you're at Day +<M>). Wait <X> more days, OR send anyway if context justifies it.

## Drafted message

> <full message in copyable block>

## After sending

Once sent, PATCH the contact:
- engageTouch → <n+1>
- lastTouchAt → today
- status → "<targetStatus>"
- statusDate → today

(Say "advance the step" and I'll run that for you.)
```

## Style

- One message, focused on a single ask. ACA structure.
- No copy-paste templates — use the prospect's name, their company, one detail from their `remarks` or recent activities.
- Match the step's intent exactly: a Day-1 connection note ≠ a Day-7 follow-up ≠ a Day-14 final.
