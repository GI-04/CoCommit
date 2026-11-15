# Plan: One public guide page that can rank for more than the name

**Status:** done <!-- Trin picked A a, B a, C a, D a in chat and approved the full text as built, 2026-10-21; ships with the PR (report OUTPUT/2026-10-21-1427-seo-guide-page.md) -->
**Date:** 2026-10-21 · **Superseded by:** —

## Why
Only `/` and `/legal` are indexed, so CoCommit can only be found by its name, and "cocommit" is also the name of three other git tools (PLAN/2026-10-21-seo-geo.md). One honest, useful page about a real question beginner teams search for gives Google and AI answer engines something to rank and quote for other words. This is item **E** that PLAN/2026-10-21-seo-geo.md left as its own task.

## Options for Trin (pick one letter per question)

**A. Topic**
- **a (recommended) — "Git for beginner teams" guide.** How a small team that's new to git shares one GitHub repo without breaking it. Real searches ("git for beginners", "how to use git in a team", "git workflow for students"); useful even to people who never sign up; nothing to say about another company's product that could go out of date. Long-tail words like "beginner team" and "hackathon team" are winnable; the short head terms ("git tutorial") are not, honestly.
- **b — "CoCommit vs GitHub Desktop".** Catches "GitHub Desktop alternative" searches, but almost nobody searches "CoCommit vs" yet, it must describe GitHub Desktop correctly and stay correct, and the unmerged `trin/seo-geo` branch already adds the FAQ "How is CoCommit different from GitHub Desktop?" to the landing page, so the two would compete.

**B. Address**
- **a (recommended) — `/guide/git-for-beginner-teams`.** Room for more guides later under `/guide/`.
- **b — `/git-for-beginner-teams`.** Shorter, but every future guide sits at the top level next to app pages.

**C. Structured data (JSON-LD)**
- **a (recommended) — `Article`** (headline, description, dates, CoCommit as author and publisher, logo). Fits a guide; read by Google and AI tools.
- **b — `Article` + `FAQPage`** built from the same questions. Google shows FAQ results only for government and health sites since 2023, so the gain is AI tools only, and the landing page will already carry `FAQPage` once `trin/seo-geo` merges.
- **c — `HowTo`.** Google stopped showing HowTo results in 2023; not worth it.

**D. Where the text lives**
- **a (recommended) — a typed list in `src/lib/guide.ts`** (intro, then question / short answer / more). The page, the JSON-LD and the tests all read it, so the tests can check each short answer is 40-60 words and the total is about 800.
- **b — a Markdown file `docs/GUIDE.md`** rendered like `/legal`. Easier to edit by hand, but the word-count and question checks become text parsing.

## Outline (for A a; full text comes with the build, for Trin to approve before it ships)
- **Tab title** (≤ 60 characters): "Git for beginner teams: a plain-words guide · CoCommit"
- **Description** (≤ 155): how a small team new to git can share one GitHub repo without breaking it: commits, branches, pull requests and pulls in plain words.
- **h1:** Git for beginner teams
- **Intro** (~60 words): for a student, club or hackathon team where one person knows the terminal; what the guide covers; any git tool works with it.
- **h2 questions**, each with a 40-60 word answer straight underneath, then a few lines or a short list where useful:
  1. What is git, and why does a team need it? (every version kept; GitHub holds the shared copy; no more zip files and overwritten work)
  2. What do commit, push and pull mean? (save a snapshot with a message; send it to GitHub; get your teammates' work)
  3. Should everyone work on main? (no: one branch per task, `main` always works; name branches after the task)
  4. How do changes get into main safely? (a pull request: the diff, one teammate reads it, then merge)
  5. Why was my push rejected? (`! [rejected] … (fetch first)` = main has commits you don't have; pull, then push; what a merge conflict is and how to settle it)
  6. What routine keeps a beginner team out of trouble? (short numbered list: pull before you start, small commits with clear messages, push at the end of each session, say so in chat)
  7. Where should team decisions and notes live? (in the repo next to the code, so new teammates and AI tools read the same thing, not lost in chat scroll)
  8. Can a beginner team do all this without the terminal? (yes: GitHub's website, GitHub Desktop, or CoCommit; only what CoCommit really does today, see "Facts used")
- **End box:** "Get started" → `/login?returnTo=/home` (switches to `/home` when signed in, same button as the landing page) and "What is CoCommit?" → `/`.

### Facts used about CoCommit (README "What works today", checked 2026-10-21)
- Free (docs/LEGAL.md "Fees"); web app plus desktop apps for Windows and macOS.
- In the browser: pick a repo and branch, edit a file, commit (optionally to a new branch), see the branch's changes, open a pull request; commits and pull requests post themselves into team chat; GitHub errors in plain words (`src/lib/errors.ts`).
- Desktop app, Local folder mode: stage, discard, diffs, commit, pull and push on a folder on your computer, with your own git.
- Team notes: a `COCOMMIT/` folder of plain Markdown in the repo; a chat message can be saved as a decision or gotcha.
- Not claimed: merging pull requests or settling merge conflicts inside CoCommit, the hero demo's "main has 2 new commits" message (it's in the demo only), any user numbers or quotes.

## Approach (for the recommended picks)
1. `src/lib/guide.ts`: title, description, dates, intro, the questions and answers, and `guideJsonLd()` (Article).
2. `src/app/guide/git-for-beginner-teams/page.tsx`: server-rendered, static. One h1, h2 per question, the end box. Same header as `/legal` (Back, logo → `/`, "Open the app"), a 3xl reading column, landing tokens and focus ring. Metadata: title, description, `robots: { index: true, follow: true }`, `alternates.canonical`; **no `openGraph`** (it drops the root share image: GOTCHAS 2026-10-18).
3. `src/components/AppShell.tsx`: `/guide/…` is full-screen like `/legal` (no app navigation).
4. `src/lib/site.ts`: add the address to `PUBLIC_PATHS` (sitemap.xml picks it up). Landing footer (`src/app/page.tsx`): a "Git guide for beginner teams" link next to "Privacy, terms and cookies". Comments that say only `/` and `/legal` are indexed get updated (root layout, site.ts).
5. `tests/seo.test.mjs`: sitemap lists the guide; the guide opts in with its canonical and sets no `openGraph`; one h1 in the page; every h2 is a question; each short answer 40-60 words; total 700-900 words; the Article data matches the guide's title, address and dates; it links to `/` and `/login?returnTo=/home`; the landing footer links to it.

## Files touched
- `src/lib/guide.ts` (new) — the text and the Article data
- `src/app/guide/git-for-beginner-teams/page.tsx` (new) — the page
- `src/components/AppShell.tsx` — `/guide/` full-screen
- `src/lib/site.ts` — `PUBLIC_PATHS`, header comment
- `src/app/page.tsx` — one footer link
- `src/app/layout.tsx` — comment only
- `tests/seo.test.mjs` — new checks
- `README.md` (layout line), `CLAUDE/HANDOFF.md`, `CLAUDE/LOG.md`, LIB `landing-page`

## Risks / needs OK
- New public words under the CoCommit name: Trin approves the full text before it ships.
- Touches Trin's UI area (landing footer, AppShell, a new page).
- Built on `main` (`6ae7f2a`). The unmerged `trin/seo-geo` branch also edits `src/lib/site.ts`'s header comment, the end of `tests/seo.test.mjs`, HANDOFF, LOG and LIB `landing-page`: whichever merges second needs a small, text-only merge.
- Nothing is committed or pushed until Trin asks; merging to `main` deploys.

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build` (the page should build as static).
- `next start` locally: the guide's `<head>` (title, description, `index, follow`, canonical, og:image and twitter:image still there, Article JSON-LD), `/sitemap.xml` lists it, the landing footer link works, no sidebar on the guide, phone (375 px) and desktop (1440 px) widths with no sideways scroll, no console errors.
- After deploy: Google Rich Results Test on the guide URL, then URL inspection in Search Console once the site is verified there.
