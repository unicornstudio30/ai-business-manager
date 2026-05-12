---
description: Pull Appsmove strategy docs from Google Drive into /strategy/. Run after first setup or when Drive docs are updated.
allowed-tools: Read, Write, Bash
---

Use the Google Drive MCP to fetch the 5 Appsmove strategy documents and write them to local `/strategy/appsmove-*.md` files. These are the framework reference (ACA, hook system, 5-part story, sprint cadence) that Claude reads on every slash command.

## File IDs (in folder `1m_HfeEerdvPNDWLflBPRSOWfrbE77MjZ`)

- Business Systems: `12knbAs6eaBmaI3YQ2kr1wjhXjelAQyqg` → `strategy/appsmove-business-systems.md`
- Networking Playbook: `1FaQt3gP9pRt-XElG25gnw5MMpcDAcioZ` → `strategy/appsmove-networking-playbook.md`
- Content Strategy: `1rUujIQBqwHSmQ2hmoDg_wwRhg0bg0X25` → `strategy/appsmove-content-strategy.md`
- Sales System: `1HHMvJVisFqaxr3WUDmHlVoesnDbLQ_3m` → `strategy/appsmove-sales-system.md`
- Sales Scripts (ACA): `12rnDMeTyAUrB5cPcaYaIhs9Ww2BO9Pvm` → `strategy/appsmove-sales-scripts-aca.md`

## Steps

1. For each file ID, call `mcp__claude_ai_Google_Drive__read_file_content` to fetch the natural-language representation.
2. Write each to its destination markdown file using the Write tool.
3. Report which files were synced + byte counts.
4. Confirm the 3 Unicorn-authored docs already exist (`strategy/unicorn-positioning.md`, `unicorn-sales-playbook.md`, `unicorn-content-pillars.md`). If any are missing, note it.

## Output

```
✓ appsmove-business-systems.md (X KB)
✓ appsmove-networking-playbook.md (X KB)
✓ appsmove-content-strategy.md (X KB)
✓ appsmove-sales-system.md (X KB)
✓ appsmove-sales-scripts-aca.md (X KB)
✓ unicorn-positioning.md present
✓ unicorn-sales-playbook.md present
✓ unicorn-content-pillars.md present

All strategy docs synced. Claude commands can read them now.
```
