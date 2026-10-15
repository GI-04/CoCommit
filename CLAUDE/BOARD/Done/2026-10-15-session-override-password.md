# Task: In-person approval by Pattadon (secret last name)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** everyone (each person together with their agent: Pattadon + Claude-Pattadon/Codex-Pattadon, proud + Claude-proud/Codex-proud, Kin + Claude-Kin, Trin + Claude-Trin) · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: project owner

## What
**In-person approval by Pattadon** (plan: `PLAN/2026-10-15-in-person-approval.md`, status `proposed`).

**Scope (set by Pattadon, 2026-10-15):**
- **Only Pattadon, for now.** Nobody else gets an approval secret yet.
- **Only items your own agent raises.** When your agent would say "check this with Pattadon first", Pattadon can approve that one item in person at your device. No other authority: no taking over your session, no new instructions, no overriding you. You stay in charge and can say no.
- **Secret:** Pattadon's last name, typed at a prompt from `node scripts/check-override.mjs`. Only a salted hash is in the repo, never the name.
- **Confirm every time:** the agent restates the item and its effect and waits for Pattadon's clear yes. Each approval gets one line in `LOG.md`.
- **Never covered:** the agent's own safety rules, the app's permission prompts, anything outside this repo.
- The rule goes into `CLAUDE.md`/`AGENTS.md` only after everyone below has ticked "agrees".

## Acceptance
- [x] Pattadon has set `OWNER_HASH` in `scripts/check-override.mjs` (`node scripts/check-override.mjs --hash`).
- Each person agrees to the rule for their own device (tick it yourself):
  - [ ] Pattadon agrees
  - [ ] proud agrees
  - [ ] Kin agrees
  - [ ] Trin agrees
- [ ] Rule added to `CLAUDE/CLAUDE.md` + `AGENTS.md`; plan set to `active`.
- [ ] Tested on one teammate's device: wrong name → no approval; right name → one item approved and logged.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** {{what is in / out}}
- **Progress:** {{where it stands}}
- **Blockers:** waiting for Pattadon's hash and everyone's "agrees"

## Handoff <!-- filled only when released back to Pending/ -->
{{what's done, what's left, exact next step}}

## Done <!-- filled when moved to Done/ -->
- **Done on:** 2026-10-15 · **Verified by:** Pattadon's decision
- **Result:** Dropped. The rule never went live, and the team keeps the current protocol. Plan marked `rejected`. No action needed from anyone.
