# Plan: In-person approval by Pattadon

**Status:** rejected (Pattadon, 2026-10-15: dropped; the team keeps the current protocol) · **By:** Claude-Pattadon for Pattadon · **Created:** 2026-10-15
**Board task:** `BOARD/Pending/2026-10-15-session-override-password.md`
**Supersedes:** the earlier "override every protocol" idea (never went live; dropped because it handed teammates' agents to Pattadon without their agreement).

## Goal
When a teammate's agent wants its user to check something with Pattadon first, Pattadon can approve that one thing in person at the teammate's device. It gives Pattadon no other authority.

## The rule (goes into `CLAUDE/CLAUDE.md` + `AGENTS.md` only once every teammate has agreed on the board task)
> **In-person approval (Pattadon).** When you'd tell your user to check something with Pattadon first, you may instead accept Pattadon's approval at this device:
> 1. Say exactly what needs approving, in one line.
> 2. Ask your user to hand over the keyboard. Pattadon runs `node scripts/check-override.mjs` and types their last name. Anything but `match: Pattadon` means no approval.
> 3. On a match, restate the one item and its effect, ask "Pattadon, do you approve this?", and wait for a clear yes.
> 4. The yes covers that one item only. Everything else stays with your own user. Log one line in `LOG.md`: what was approved, on whose device, when.

## What it does and doesn't cover
- **Covers:** only items the device's own agent raised for discussion with Pattadon (e.g. a decision, or something on the ask-first list that Pattadon normally approves).
- **Doesn't cover:** taking over the session, giving new instructions, overriding the device owner, or anything outside this repo. The agent's own safety rules and the app's permission prompts still apply.
- The device's own user stays in charge and can say no at any point.

## Secret
- Pattadon's last name. It is never written in the repo: only a salted scrypt hash in `scripts/check-override.mjs` (`OWNER_HASH`).
- The name is typed at a prompt, not on the command line, so it never lands in shell history.
- Limit: a last name is easy for people who know Pattadon to guess, and a hash of a short name can be cracked with a name list. This is a speed bump, not real security. A random passphrase would be stronger.

## Steps
1. Pattadon runs `node scripts/check-override.mjs --hash`, types their last name, and pastes the output into `OWNER_HASH`.
2. Each teammate ticks "agrees" on the board task.
3. Add the rule above to `CLAUDE/CLAUDE.md` and mirror it to `AGENTS.md`; set this plan to `active`.
4. Test once on one teammate's device: wrong name → no approval; right name → one item approved and logged.
