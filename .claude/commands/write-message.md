---
description: Draft a personalized networking message (3 variants) for a PRM contact using the ACA/AIDA/PAS/FAB/BAB/QUEST/Casual framework. Usage /write-message <contact-id> [framework=ACA]
allowed-tools: mcp__claude_ai_Personal_Business_Manager__networking_next_drafts, mcp__claude_ai_Personal_Business_Manager__networking_message_context, mcp__claude_ai_Personal_Business_Manager__save_networking_draft, mcp__claude_ai_Personal_Business_Manager__parse_social_profile, Read, Bash
---

Draft a personalized networking outreach message for one PRM (networking) contact — three lengths (short / standard / detailed) all sharing the same intent and ask. Grounds the message in the recipient's actual profile + recent post + relationship, and saves the drafts to the app for review.

Called with `/write-message <contact-id> [framework=ACA]`. If no contact-id is given, first call `networking_next_drafts` to pick the highest-priority target.

## Voice + framework

Write as **Saidur Rahaman, founder of Unicorn Studio** — a small studio of 4–5 members building AI automation, integrations, SaaS, websites, and branding for AI SaaS founders. Cap of 3–4 clients / month, custom-built (not templates), positioned around AI-native systems.

Read `strategy/unicorn-positioning.md` and `strategy/appsmove-networking-playbook.md` FIRST for tone + framework mechanics. Reference the offer only when the framework calls for an ask; never pitch in the first sentence.

Frameworks (pick one via the `framework=` argument, default **ACA**):

- **ACA** — Acknowledge → Compliment → Ask. Warm opener for cold-ish contacts. Default.
- **AIDA** — Attention → Interest → Desire → Action. Sales arc for late-funnel.
- **PAS** — Problem → Agitate → Solve. Pain-led, when the recipient is clearly hurting.
- **FAB** — Features → Advantages → Benefits. Offer-led when they already know you.
- **BAB** — Before → After → Bridge. Transformation story, good for testimonials-adjacent asks.
- **QUEST** — Qualify → Understand → Educate → Stimulate → Transition. Consultative, discovery calls.
- **Casual** — no framework, just a thoughtful personal note. Warm follow-ups after real conversations.

## Steps

### 1. Pick the contact

If the user gave a contact-id in the args, use it directly.

Otherwise, call `networking_next_drafts` and pick the top item (overdue > due-today > going-cold > never-messaged). Confirm the pick with a one-line summary before continuing.

### 2. Pull context

Call `networking_message_context` with `contact_id`. This returns:

- Full recipient profile (role, position, company, interests, notes, recent post, etc.)
- Last message you sent them (for thread continuity)
- Framework options
- Sender identity

If `recent_post` is empty AND the contact has a `profile_url`, offer to run `parse_social_profile` on it (mode=`url`) to enrich context — but only if the URL is publicly fetchable (not LinkedIn/X, which block server fetches).

### 3. Draft the 3 variants

Rules — enforce all of them:

- **Personalize.** Use their name, and reference at least one concrete detail from their profile OR their recent post. If `recent_post` is set, quote or reference one sharp phrase / claim / angle — do NOT paraphrase the whole thing.
- **One ask, three lengths.** All three variants share the SAME intent and the SAME ask. They only differ in length + amount of supporting context.
  - `short`: 1–2 sentences, ~25–45 words. Quick DM ping.
  - `standard`: 3–5 sentences, ~60–100 words. Default length.
  - `detailed`: 6–10 sentences, ~120–200 words. Email or deeper first touch.
- **Voice.** Confident, specific, never salesy. Lead with the recipient's situation, not the offer. Mention Unicorn Studio only if the framework calls for it (usually in the Ask / Action).
- **Framework.** Follow the picked framework's arc strictly. Do not blend frameworks.
- **Language.** Match `language` from the context (default English).
- **Tone.** Match the recipient's `relationship`:
  - Friend / warm → casual, personal, no signature energy
  - Peer / stranger → professional-warm
  - Investor / customer / partner → concise, respectful, one clear ask
- **What to avoid:** generic openers ("hope you're well"), buzzword salad, name-drop-heavy flexes, "checking in" without a reason, multiple asks in one message.

### 4. Save the drafts

Call `save_networking_draft` with:

- `contact_id` — as picked
- `short`, `standard`, `detailed` — your three variants
- `framework` — the one you used (e.g. `"ACA"`)
- `tone` — one word (Friendly / Professional / Direct / Casual)
- `channel` — usually `"DM / Inbox"` unless the recipient's `platform` is `Email`
- `language` — as detected
- `purpose` — one-line ("book a discovery call", "invite to podcast", "reconnect after 3 months", …)
- `topic` — the specific angle you took (e.g. "AI-native operators vs AI-layer tools")
- `context_chips` — up to 3 short tags describing why now (e.g. ["saw their AI SaaS launch", "shared connection", "cold LinkedIn"])
- `cta_chips` — up to 3 short tags describing the ask (e.g. ["15-min call", "swap notes", "intro to their COO"])
- `recent_post_used` — the excerpt you referenced (for the audit trail on `/networking/[id]`)

### 5. Report back

Print a compact summary the user can act on:

```
# Drafted for <Name> (<relationship>)

**Framework**: <framework> · **Channel**: <channel> · **Language**: <language>
**Purpose**: <purpose>
**Grounded in**: <recent_post_excerpt or "profile only">

## Short
> <short variant, in a blockquote>

## Standard
> <standard variant>

## Detailed
> <detailed variant>

---
Saved as message `<message_id>` on `/networking/<contact_id>`. Review and send from your actual DM / email, then run `/mark-sent <message_id>` (or the `mark_networking_message_sent` MCP tool) when it goes out.
```

## Notes

- The `save_networking_draft` MCP tool always writes status=`draft`. Sending is a separate manual step — you review the copy before it goes out.
- If `networking_message_context` returns `error: "Contact not found"`, the user probably passed a Sales CRM contact id (not a networking one). Point them to `/networking` or ask them to run `/networking-sync` first.
- Do NOT paste sender signatures, phone numbers, or hyperlinks into the body. Keep the message clean — Saidur adds them at send-time.
- For repeat outreach (previous_drafts_count > 0), open the message with an implicit or explicit thread reference. Don't restart the conversation.
