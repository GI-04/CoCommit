# Plan: Account profile and settings

**Status:** done
**Date:** 2026-10-15 · **By:** Codex-Pattadon · **Superseded by:** —

## Goal
Users can open their profile from the sidebar, see which accounts are signed in, and persist changes to their CoCommit profile and supported account settings.

## Proposed experience
- `/profile`: profile summary, display-name and avatar-URL form, account details and sign-out.
- Name/avatar edits for a non-anonymous Supabase account persist to the existing `profiles` row and auth metadata; sidebar and future chat messages use the saved values after saving/reloading.
- Email accounts get email/password settings with validation, confirmation messaging and clear loading/error/success states. Never expose passwords or tokens.
- Show GitHub username, name, avatar and profile link when signed in with GitHub. GitHub-owned account details are managed through a clearly labelled GitHub settings link. Existing GitHub OAuth has no profile-write scope, and the GitHub cookie is not a Supabase profile identity.
- If only GitHub is signed in, clearly show the provider-owned profile and the link to manage it; do not claim that a local edit would persist to a linked CoCommit account that does not yet exist.
- If both providers are signed in, label both accounts independently. Never silently associate unrelated identities.
- Signed-out users get a login link returning to `/profile`; anonymous chat sessions do not count as accounts. Include an intentional loading state.
- Follow existing light/dark styles, accessible form labels and responsive layout.

## Files and implementation
- New `src/app/profile/page.tsx` and `src/lib/profile.ts` for profile loading, validation and saves.
- Update `src/components/UserChip.tsx` with profile navigation and saved-profile display.
- Update `src/lib/chat.ts` so future messages resolve the saved profile name without stale cached names.
- Adjust `supabase/profiles.sql` only if required to keep existing rows/auth metadata synchronized under the user's own session; provide any SQL setup step explicitly.
- Reuse existing Supabase clients, GitHub session API and email auth error handling. No package installation.

## Scope boundary
This does not implement the separate pending unified-login task. GitHub-only in-app profile editing needs that identity/storage work first. GitHub provider settings remain accessible through GitHub's settings page.

## Verification
- Typecheck and production build.
- Check signed-out, anonymous, GitHub-only, Supabase-only and dual-session states with controlled fixtures.
- Check invalid names/avatar URLs, failed saves, successful save/reload persistence, sidebar refresh and future chat display names.
- Confirm profile writes use only the authenticated user's ID, and credential fields never appear in public profile records.
- Browser layout checks at narrow and desktop widths when available. Live account changes only with a user-provided test account/session; otherwise report that verification limit.

## Approval
Approved by Pattadon in this chat (2026-10-15: ‘it's ok’). Implementation owned by Codex-Pattadon.

## Result
Implemented and verified with typecheck, Webpack production build, 16 controlled tests and signed-out browser checks at 390px/1280px. Live authenticated edits remain a manual check. See OUTPUT/2026-10-15-account-profile.md.
