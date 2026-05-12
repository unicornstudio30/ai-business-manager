---
description: Find stuck contacts (no movement in 11+ days), draft stage-appropriate ACA follow-ups. Optional --stage=<stage>.
allowed-tools: Bash, Read
---

Review the CRM, find contacts that haven't moved in 11+ days, and draft the right next message for each.

Use shell vars: `APP_URL`, `CLAUDE_API_KEY`.

## Steps

1. Read `strategy/unicorn-sales-playbook.md` (stage-specific scripts) and `strategy/appsmove-sales-scripts-aca.md` (ACA framework).
2. Sync contacts:

```bash
curl -s -X POST "${APP_URL:-http://localhost:3000}/api/sync?entity=contacts" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}" > /dev/null
```

3. Fetch contacts needing follow-up:

```bash
curl -s "${APP_URL:-http://localhost:3000}/api/contacts/needs-follow-up?days=11&limit=30" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}"
```

4. For each contact:
   - Determine the right move based on their stage:
     - **1st message, 1st/2nd Prospect Follow-up** → nudge with a value-add observation
     - **Lead, 1st/2nd Lead Follow up** → re-engage with a sharper question about their AI/ops setup
     - **Qualified** → propose a 20-min scoping call
     - **Proposal Sent, Post Proposal Follow-up-1/2** → soft check-in, anchor on their stated goal
     - **Booking, First call** → confirm time, send agenda
     - **Follow up later** → light nurture, no ask
   - Draft a 4-6 sentence message using ACA.
   - POST as `follow_up_sent` activity:

```bash
curl -s -X POST "${APP_URL:-http://localhost:3000}/api/activities" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contact_id":"<id>","type":"follow_up_sent","content":"<draft>"}'
```

## Output

Numbered list:

```
1. [Name](${APP_URL}/contacts/[id]) — Stage — N days stuck
   > <draft message in a copyable code block>

2. ...
```

End with a 1-line summary: "Drafted N follow-ups across <X stages>. Open the contact pages to send."

## Style

- Match the stage. A Proposal Sent follow-up is different from a 2nd Prospect Follow-up.
- Never identical wording across contacts — personalize each.
- Use the prospect's name, agency, or one specific detail from their `remarks` field if useful.
- Direct, not desperate. No "just checking in" filler — give them a reason to reply.
