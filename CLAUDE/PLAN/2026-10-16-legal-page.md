# Plan: public Legal page (/legal)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "Add legal page", with `docs/LEGAL.md` attached)

## Why
`docs/LEGAL.md` (Privacy Policy, Cookies and browser storage, Terms of Service, Copyright, Contact) exists but nobody can read it in the app. Submission is due soon, so the page must be small and safe.

## Approach (no new packages)
1. `docs/LEGAL.md` stays the single source of truth; the page reads it with `node:fs` at build time (static page).
2. `src/lib/markdown-lite.ts`: a pure parser for the Markdown subset the file uses (headings 1-4 with slug ids that match its in-page links, paragraphs, lists, tables, bold/italic/code/links, quotes, rules). Only `http`, `https`, `mailto` and `#anchor` links stay links; no raw HTML (HTML comments, like the maintainer notes at the end of the file, are dropped).
3. `src/components/Markdown.tsx`: renders that tree as React elements (no `dangerouslySetInnerHTML`), dark theme, readable width, tables scroll inside their own box.
4. `src/app/legal/page.tsx` + `layout.tsx` (title "Legal"): full-screen page with the wordmark and a link to the app. Added to the full-screen list in `AppShell.tsx` and to the public routes in `src/proxy.ts`.
5. Small links "Privacy, terms and cookies" in the landing footer, the login screens (`AuthShell.tsx`) and at the bottom of Profile.

## Files touched
`docs/LEGAL.md` (copied unchanged), `src/lib/markdown-lite.ts`, `tests/markdown-lite.test.mjs`, `src/components/Markdown.tsx`, `src/app/legal/page.tsx`, `src/app/legal/layout.tsx`, `src/components/AppShell.tsx`, `src/proxy.ts`, `src/app/page.tsx`, `src/components/AuthShell.tsx`, `src/app/profile/page.tsx`.

## Risks / needs OK
- The text of `LEGAL.md` is not legal advice; its own maintainer note says a Thai lawyer should review it before commercial use. The page shows the file as written.
- Merging to `main` deploys. `deploy-vercel.yml` ignores `docs/**` and `**/*.md`, so later edits to `LEGAL.md` alone do not redeploy (run the workflow by hand).

## How we'll verify
`npm run typecheck`, `npm test` (new parser test, including the real `docs/LEGAL.md` with every in-page link pointing at a heading), `npm run build` (`/legal` listed as static).

## Changes while building
- A newline inside a paragraph is kept as a line break (not joined into one line): `LEGAL.md` writes its bold sub-labels ("**d. Calls**") on their own line above the text.
- Bare `https://` URLs and email addresses become links, so the Contact table has `mailto:` links without changing the file.
- Tables are `role="region"` named after their heading and focusable, so they can be scrolled sideways with the keyboard.
- The HTML comment with the maintainer notes at the end of `LEGAL.md` is dropped from the page (no raw HTML is ever output).
- The link in the login card footer appears once the client has rendered `/login` (that page sits behind `Suspense`); `/login/forgot` and `/login/reset` have it in the static HTML.
- Not built: code fences, images, setext headings (the file uses none).
- Checked: `npm run typecheck`, `npm test` (222 pass, 16 new), `npm run build` (`/legal` listed as static, prerendered HTML has the 5 section ids, 4 `mailto:` links and 6 tables). Not checked in a browser.
