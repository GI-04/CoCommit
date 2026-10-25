# Plan: Repository page with some magic

<!-- Filename: YYYY-MM-DD-<slug>.md. Never delete a plan: set its status instead. -->

**Status:** active
**Date:** 2026-10-22 · **Superseded by:** —

Approved by Trin in chat on 2026-10-22: `q1:d q2:a q3:c q4:a q5:a` (A + C + commit spines, all six navigation fixes,
both motions, Figma frames first on "repo page idea", code later on a new `trin/repo-magic` from `main` after PR #69).

Trin: the Repository page is "good but too normal, sometimes hard to navigate, missing some magic". Moodboard: Figma
`A5ao1epDSl3hnbGX599un3`, page "repo page idea" (`243:6367`): colour-tabbed index folders ("Fragments 15–20"), book
spines on shelves (Colophon × Monotype, "Upcoming releases", libra.re), folders with paper peeking out (Idea Nest),
sticky notes (Zeit), cassettes, a sentence-style filter ("All, Books, Music, …").

## Why (what makes it hard to navigate today, from Trin's screenshot and `src/app/repo/page.tsx`)
1. **The steps zig-zag.** Pick a file (left list) → edit (right panel) → Commit (pink card under the list, below the fold
   at 1440 × 900) → Open PR (bottom of the same card). While editing you can't see the Commit button.
2. **Three look-alike switches.** Web / Local folder, Changes / Files, Diff / Edit are the same big pill; Diff / Edit takes
   ~40 % of the panel header. "Where am I" and "how do I view it" look the same.
3. **Empty space wins.** On `main`: "Changes 0", "No file picked", "Nothing to compare yet". The biggest area on the page
   is an empty dark panel.
4. **Hidden context.** The repo picker says "Team"; branches are a native dropdown; nothing shows where the branch is
   compared with `main`, who changed what, or recent commits / open PRs.
5. **Scroll inside scroll.** The file tree is a 24 rem box inside the page; deep folders mean scrolling a small card.
6. **Edit is a plain textarea**, and "Edit" with no file open just jumps the left list to Files.

## Approach
Navigation fixes (any direction):
1. One flow, always visible: a step rail **Pick → Change → Save → Ask the team** at the top; the current step lights up.
2. The save box sits beside the editor and follows it (sticky), with your changed files in it; PR is its own step.
3. One look per switch: page mode (Web / Local) small in the header; view switches (Diff / Edit) small in the panel.
4. The empty panel becomes an invitation: README preview, recent commits, "Pick a file to start".
5. "Team" → "Repository"; branch picker shows branches as chips with "N changes vs main".
6. No nested scroll: the browser grows with the page.

Magic (Trin picks one, q1):
- **A · Index drawer:** folders are colour tabs stacked like a physical breadcrumb (always see where you are, click a tab
  to go back); the open layer shows files as typewriter rows with "last changed · by whom"; edited files get a sticky flag.
- **B · Bookshelf:** top-level folders are book spines (height = file count); click one and it tips out and opens;
  recent commits are a shelf of thin spines coloured by teammate (same colours as Team spines).
- **C · Desk:** every edit becomes a sticky note in a "Your changes" tray; writing the commit message is writing on an
  envelope; Save = notes fly into it and it lands on the branch.
- **Recommended: A + C**, with B's commit spines as a small history strip. A fixes browsing, C fixes saving; B alone is
  the most striking but weakest for deep folders.

## Questions
- **q1 Direction:** a) A · b) B · c) C · **d) A + C + commit spines (recommended)**
- **q2 Navigation fixes 1–6:** **a) all (recommended)** · b) only some (say which)
- **q3 Motion:** a) tab pull-up spring only · b) commit "notes into envelope" only · **c) both (recommended)**; all off
  with `prefers-reduced-motion`
- **q4 First step:** **a) Figma frames on "repo page idea" next to the moodboard (recommended)** · b) straight to code
  on demo data · c) a clickable HTML prototype
- **q5 Branch:** **a) new `trin/repo-magic` from `main` after PR #69 merges (recommended; it uses the glass springs)** ·
  b) on top of `trin/resizable-nav` now

## Progress
- **2026-10-22 · Figma (q4:a) done.** File `A5ao1epDSl3hnbGX599un3`, page "repo page idea", to the right of the moodboard:
  - `245:23` **Repo magic · parts**: components `Repo step` (Done / Current / Next), `Drawer tab` (Offset 0–3, override Tab + Strip fill),
    `Drawer row` (Folder / File / File selected, Edited flag), `Sticky note`, `Commit spine`.
  - `249:23` **Repo · Magic · Edit** (1440): serif repo name as the repo picker, branch chip + "2 saves ahead of main", Web / Local
    folder, "Recent saves" spine shelf with a hover tooltip, step rail, index drawer (filter sentence, Go to file ⌘K, tab stack, other
    folders as closed tabs), editor with changes marked, desk (sticky notes, envelope save card, Ask the team card).
  - `250:223` **Repo · Magic · Start** (1440, on main, nothing picked): step 1 current, root layer open, "Pick a file to start." with
    README preview and "Lately in this repo".
  - `251:330` **Phone · Repo · Magic · Edit** (390 × 844): top bar, step progress bars, folded drawer, editor, desk docked at the bottom.
  - `251:465` **Repo · Magic · Motion**: storyboards for the tab pull-up and notes-into-the-envelope, with timings and reduced motion.
- Design choices made while drawing: **Instrument Serif** for the repo name and drawer tabs (Google font, `next/font/google`, no
  package install); "Save" instead of "Commit" in buttons (the envelope says "Saving makes a commit"); the desk can hold several
  edited files and saves them in one commit (`commitFiles` already takes a list).
- **Data limits found:** GitHub's commit list has no line or file counts, so spine height can't mean "lines changed" without one extra
  call per commit (q7); "last changed · by whom" on each drawer row needs one call per file (q6). The Start frame no longer shows
  file counts.

- **2026-10-23 · Code built** on `trin/repo-magic`, made from `trin/liquid-glass` (PR #69) at Trin's request instead of waiting
  for #69 to merge (q5 changed). Report `OUTPUT/2026-10-23-0025-repo-magic.md`: typecheck, 254/254 tests, build, browser at
  1440 / 1280 / 1024 / 768 / 375 px on demo data. Found while checking: at a 1024 px window three columns left the editor 108 px,
  so the layout now follows the content width (DECISIONS 2026-10-23). Not committed.

- **2026-10-23 · Drawer fix.** Trin found the drawer confusing (screenshot: the other top-level folders stacked under the open
  layer like a staircase read as `public → src`, and `docs` / `src` were both green). Trin picked option A: one strip per level
  with the open folder's tab tall and its siblings beside it; colours by position, never the strip's colour. Tests 255/255,
  build, browser at 1440 and 375 px.

## More questions (from drawing it)
Answered by Trin on 2026-10-23: `q6:a q7:a` (row meta loaded for the open folder only, cached, max 30 files; spine height
decorative, from the commit id). No frame changes requested.

- **q6 Drawer row meta ("1w · Trin"):** **a) load it for the open folder only, cached, max 30 files (recommended)** · b) show the file
  size instead · c) leave it out
- **q7 Spine height:** **a) decorative, from the commit id (recommended)** · b) real lines changed (one extra call per commit, 14 calls)

## Files touched (if built)
- `src/app/repo/page.tsx` — layout, step rail, save box, empty states.
- `src/components/FileTree.tsx` (or a new `IndexDrawer.tsx`) — the tab-drawer browser.
- New `src/components/repo/` pieces (step rail, changes tray, commit spines); pure helpers in `src/lib/` with tests.
- `src/app/globals.css` — tab, sticky-note and commit motion.
- Uses existing `listCommits` for the history strip; no new GitHub calls planned.
- `LocalRepo.tsx` — same rail and tray later, if Trin wants Local mode to match.

## Risks / needs OK
- Biggest page rewrite since the Figma pass; keep the same GitHub calls and the beginner wording.
- Lots of colour: keep text contrast ≥ 4.5:1 on every tab colour.
- Deep folder paths (5+ levels) need the tab stack to collapse ("… / 3 more").

## How we'll verify
- `npm test` (new helpers), `npm run typecheck`, `npm run build`.
- Browser pane on demo data at 1440 / 1024 / 768 / 375 px: pick → edit → save → PR without scrolling back up, deep
  folders, long names, keyboard through tabs, reduced motion, no sideways scroll, no console errors.
