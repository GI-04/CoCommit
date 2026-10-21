# Getting CoCommit found: steps and ready-to-post text

**Date:** 2026-10-21 · **By:** Claude-Trin · **Plan:** `PLAN/2026-10-21-seo-geo.md`

Google ranks a new site mostly by who links to it. Everything below is for teammates to do with their own accounts. All text is factual: no invented users, numbers or quotes. Post each one from a real person's account and link to https://cocommit.vercel.app.

## 1. Search Console and Bing (Trin, ~10 min, do first)
1. https://search.google.com/search-console → **Add property** → **URL prefix** → `https://cocommit.vercel.app/` → method **HTML tag**. Copy only the `content="…"` value and send it to Claude. It goes into `GOOGLE_SITE_VERIFICATION` in `src/lib/site.ts`, then it needs a PR, a merge and a deploy.
2. Once it's live, click **Verify**. Then **Sitemaps** → submit `sitemap.xml`, and **URL inspection** → `https://cocommit.vercel.app/` → **Request indexing**.
3. https://www.bing.com/webmasters → **Import from Google Search Console** (no code needed). Bing's index also feeds ChatGPT search.
4. After a few days, search `site:cocommit.vercel.app` on Google to see what's indexed.

## 2. GitHub repo "About" box (needs an org admin, e.g. Thor1006)
The topics are already set (git, git-gui, github, beginner-friendly, team-collaboration, nextjs, tauri, hackathon). Changing the website and description needs admin rights. On https://github.com/GI-04/CoCommit, click the gear next to **About** and fill in:
- **Website:** `https://cocommit.vercel.app`
- **Description:** `CoCommit: git with buttons for beginner teams. Commit, push and open pull requests without the terminal, with team chat, calls, files and shared AI context. Built for FLOW summit 2026.`

## 3. Devpost / hackathon project page
**Tagline:** Git with buttons for beginner teams.

**About:** CoCommit is a free git app for beginner teams. Student teams usually work across a chat app, a GitHub repo and a terminal that only one person understands. CoCommit puts them in one window: commit, pull, push and open pull requests with buttons, see git errors in plain words, and keep team chat, calls, shared files, a task board and a shared AI context next to the code. It runs in the browser and as a desktop app for Windows and macOS. Built with Next.js, Supabase, LiveKit and Tauri.

**Try it:** https://cocommit.vercel.app · **Code:** https://github.com/GI-04/CoCommit

## 4. dev.to (or Medium / Hashnode) short post
**Title:** We built a git app with buttons for beginner teams

**Tags:** git, beginners, webdev, showdev

**Body (edit freely, keep it first-person and true):**
> In our hackathon team, only one of us was comfortable with git. Everyone else asked "did you push yet?" in Discord and pasted commands from tutorials. So we built CoCommit: commit, pull, push and pull requests as buttons, with git errors in plain words ("main has 2 new commits. Get the latest first.").
>
> Because the code is only half of teamwork, pushes and merges also show up in team chat, and there are calls, a shared Drive and a task board in the same window. A `COCOMMIT/` folder of plain Markdown keeps the project's decisions and gotchas, so every teammate's AI agent reads the same context.
>
> It's free and runs in the browser (desktop apps for Windows and macOS too): https://cocommit.vercel.app. Code: https://github.com/GI-04/CoCommit. Feedback welcome, especially from people learning git.

## 5. Product Hunt (only when the team is ready to answer comments that day)
- **Name:** CoCommit
- **Tagline (≤60):** Git with buttons for beginner teams
- **Description (≤260):** Commit, push and open pull requests with buttons instead of the terminal, with git errors in plain words. Team chat, calls, files, tasks and a shared AI context live next to the code. Free, in the browser and on Windows and macOS.
- **Topics:** Developer Tools, Education, Productivity

## 6. Everyday links that help
- Each teammate: add https://cocommit.vercel.app to your GitHub profile README or website field, and to your LinkedIn "Projects".
- Share the link in the FLOW summit channels and your university's dev communities. Preview cards show the share image automatically.
- Answer real questions on Reddit or Stack Overflow ("git for beginners", "git GUI for a student team") only where CoCommit truly fits, and say you're on the team.
