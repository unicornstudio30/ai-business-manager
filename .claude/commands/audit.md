---
description: Audit a prospect's website and draft an ACA outreach email. Usage /audit <url> [--contact-id=<id>]
allowed-tools: Bash, WebFetch, Read
---

Run a site audit and draft an outreach email targeting Unicorn Studio's specific service line based on what's missing.

Use shell vars: `APP_URL`, `CLAUDE_API_KEY`.

## Steps

1. Read `strategy/unicorn-positioning.md` (the 6 service lines + ICP) and `strategy/unicorn-sales-playbook.md` + `strategy/appsmove-sales-scripts-aca.md`.
2. WebFetch the URL the user passed. Capture title, meta, headlines, primary CTA, any AI mentions, visible tech stack signals.
3. Score on 4 dimensions (each 1-5):
   - **design** — visual polish, hierarchy, consistency
   - **copy** — clarity of who they help, what they sell, why pick them
   - **conversion** — visible CTAs, friction to engage, trust signals
   - **speed_signal** — heuristic from HTML weight + image count
4. Detect stack: WordPress / Webflow / Framer / Next.js / etc.
5. Identify missing pages: /case-studies, /pricing, /about, /blog, /demo, /contact.
6. Draft an ACA email **specific to Unicorn Studio's most relevant service line**:
   - SaaS site with weak AI integration mentions → pitch **AI Integrations**
   - Beautiful site but manual ops mentioned → pitch **AI Systems**
   - Outdated WordPress site → pitch **Website** rebuild
   - Strong product but weak positioning → pitch **Branding**
7. POST the audit:

```bash
curl -s -X POST "${APP_URL:-http://localhost:3000}/api/audits" \
  -H "x-claude-api-key: ${CLAUDE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"url":"<url>","summary":"<2-3 sentence audit>","scores":{...},"detected_stack":[...],"missing_pages":[...],"email_draft":"<full email>","contact_id":"<id if passed>"}'
```

   (Note: `/api/audits` POST not implemented yet — if it 404s, output the email and tell the user.)
8. If `--contact-id` was passed, ALSO POST two activities: `audit_run` (summary) and `email_drafted` (the email).

## Output

```
# Audit — <url>

**Detected stack**: <stack>
**Scores**: design X/5 · copy Y/5 · conversion Z/5 · speed A/5
**Missing pages**: <list>

## Summary
<2-3 sentence honest read>

## Recommended pitch: <service line>
<1-sentence rationale>

## Drafted email

Subject: <subject line>

<full email body in ACA structure>
```

End with: "Saved to /audits. Copy the email block above to send."

## Style

The email should:
- Lead with 1 SPECIFIC observation about their site (not generic praise)
- Acknowledge what they're doing well
- Surface ONE specific gap that Unicorn's chosen service line addresses
- Soft ask: 20-min discovery call (not a pitch — a diagnostic)
- No hard sell, no urgency tricks
- Mention the 3-4 clients/month capacity cap only if relevant
