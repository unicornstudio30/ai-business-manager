---
description: Daily morning briefing — pipeline snapshot, follow-ups due, stuck deals, today's top 3 priorities.
allowed-tools: Bash, Read
---

Generate Saidur's morning briefing as a clean Markdown summary.

Use shell vars: `APP_URL` (default `http://localhost:3000`), `CLAUDE_API_KEY`.

## Steps

1. Read `strategy/unicorn-positioning.md` and `strategy/unicorn-sales-playbook.md` for voice/methodology context.
2. Read `strategy/appsmove-sales-system.md` for the framework reference (esp. weekly review and follow-up cadence sections).
3. Trigger sync (best effort, per-entity):

```bash
for entity in contacts content_items tracker_entries; do
  curl -s -X POST "${APP_URL:-http://localhost:3000}/api/sync?entity=$entity" \
    -H "x-claude-api-key: ${CLAUDE_API_KEY}" > /dev/null
done
```

4. Fetch the aggregated briefing:

```bash
curl -s "${APP_URL:-http://localhost:3000}/api/briefing" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}"
```

5. Parse the JSON.

## Output (Markdown, in this exact structure)

```
# Morning briefing — <today's date>

## Yesterday's KPIs
[If yesterdayMissing is true: "⚠️ No data logged yesterday — fill in the Daily KPIs page."]
[Else: one-line summary of the numbers.]

## Pipeline snapshot
- Cold: X · Engaged: Y · Qualified: Z · Proposal: A · Call: B · Won: C
- Total: <stats.totalContacts> · Hot leads: <stats.hotLeads> · Active clients: <stats.activeClients>

## Follow-ups due (11+ days)
[Numbered list, top 5. Each: name (stage) — days since last touch — link to contact page]
[If 0: "All current leads are within 10 days. Nice."]

## Stuck deals to nudge
[From hotLeads + needsFollowUp combined. Anything in Proposal Sent / Post Proposal / Lead stages for >7 days.]
[Up to 5. Each: name (stage) — what step to take next.]

## Top 3 priorities for today
[Reason from the data + the strategy docs.]

## Suggested commands
[1-3 specific slash commands to run next, based on the state.]
```

## Style

Concise. Founder energy. No filler. Use the 18-stage names verbatim from `lib/stages.ts`. Hot leads and follow-ups should have clickable links: `[Name](${APP_URL}/contacts/[id])`.
