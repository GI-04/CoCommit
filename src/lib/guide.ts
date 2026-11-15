// The public guide at /guide/git-for-beginner-teams (PLAN/2026-10-21-seo-guide-page.md): its text, and the Article
// data built from it. The page, the JSON-LD and tests/seo.test.mjs all read this file. Rules for the text: every
// heading is a question, the answer right under it is 40-60 words, about 800 words in all, and anything said about
// CoCommit must be true today (README "What works today"). `code` in backticks is shown as code.

import { SITE_NAME, SITE_URL } from "@/lib/site";

export const GUIDE_PATH = "/guide/git-for-beginner-teams";
export const GUIDE_TITLE = "Git for beginner teams: a plain-words guide";
export const GUIDE_HEADING = "Git for beginner teams";
export const GUIDE_DESCRIPTION =
  "How a small team that’s new to git can share one GitHub repo without losing work: commits, branches, pull requests and pulls, in plain words.";
// ISO dates; change GUIDE_MODIFIED whenever the text changes.
export const GUIDE_PUBLISHED = "2026-10-21";
export const GUIDE_MODIFIED = "2026-10-21";

export const GUIDE_INTRO =
  "This guide is for small teams that are new to git: a class project, a club or a hackathon team where maybe one person has used the terminal before. It explains the handful of ideas you need to share one GitHub repository without losing work, in plain words. It works with any git tool, including the one we make.";

export type GuideSection = {
  id: string; // the heading's anchor
  question: string;
  answer: string; // 40-60 words, straight under the heading
  more?: string[]; // extra paragraphs
  steps?: string[]; // a numbered list after the answer
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "what-is-git",
    question: "What is git, and why does a team need it?",
    answer:
      "Git is a tool that keeps every saved version of a project, with who changed what and why. GitHub is a website that holds the team’s shared copy. Together they replace zip files in chat and the classic disaster of two people editing the same file and one of them losing a day’s work.",
    more: ["Because every saved version is kept, a mistake in saved work is never final: you can see exactly what changed and go back."],
  },
  {
    id: "commit-push-pull",
    question: "What do commit, push and pull mean?",
    answer:
      "A commit is a saved snapshot of your changes with a short message, like “Add login button”. Pushing sends your commits to GitHub so the team can see them. Pulling brings your teammates’ new commits into your copy. Until you push, your commits stay only on your computer.",
    more: ["A good message says what the change does: “Fix crash when the list is empty” helps the whole team a month later; “stuff” helps nobody."],
  },
  {
    id: "branches",
    question: "Should everyone work on main?",
    answer:
      "No. Keep `main` as the version that always works, and give each task its own branch: a separate line of commits that can’t break anyone else’s work. Name the branch after the task, like `fix-signup-email`. When the task is done, the branch goes back into `main` through a pull request.",
    more: ["Keep branches small and short-lived. A branch that lasts a day or two rarely collides with anyone else’s changes; one that lasts three weeks often does."],
  },
  {
    id: "pull-requests",
    question: "How do changes get into main safely?",
    answer:
      "Through a pull request. You open one on GitHub to ask for your branch to be merged into `main`. It shows every changed line, so a teammate can read it, leave comments and approve it. Once someone has looked, merge it, and your work joins `main`.",
    more: ["Reviews don’t need an expert. “I ran it and the page loads” or “what does this function do?” already catches real mistakes, and everyone learns the code faster."],
  },
  {
    id: "push-rejected",
    question: "Why was my push rejected?",
    answer:
      "Usually because a teammate pushed first. A message like `! [rejected] main -> main (fetch first)` means GitHub has commits you don’t have yet, and git won’t let you overwrite them. Pull first to bring them in, check that everything still works, then push again. Nothing is lost; git is protecting your teammate’s work.",
    more: [
      "If you and a teammate changed the same lines, the pull stops with a merge conflict. Git marks both versions in the file; you keep the right one (or a mix of both), delete the markers and commit. GitHub’s website can settle simple conflicts inside a pull request too.",
    ],
  },
  {
    id: "routine",
    question: "What routine keeps a beginner team out of trouble?",
    answer:
      "A short one, done every time. Git trouble in a new team usually comes from long gaps between pulls and pushes, or from two people quietly editing the same file. A five-step habit for every work session prevents most of it, and soon takes less than a minute.",
    steps: [
      "Pull before you start, so you begin from the team’s latest work.",
      "Make a branch for your task, or switch to the one you already have.",
      "Commit in small steps, each with a message that says what changed.",
      "Push before you stop, even if the task isn’t finished.",
      "Tell the team in chat what you pushed and what comes next.",
    ],
  },
  {
    id: "team-notes",
    question: "Where should team decisions and notes live?",
    answer:
      "In the repository, next to the code. A short notes folder with the plan, decisions and known problems means a new teammate, or tomorrow’s you, can catch up without scrolling through weeks of chat. Because it’s plain text in git, every change to the notes is saved and can be reviewed like code.",
    more: [
      "It helps with AI tools too. AI coding assistants can read the files in your repo, so notes kept there give every teammate’s assistant the same picture of the project, instead of each person explaining it again.",
    ],
  },
  {
    id: "without-terminal",
    question: "Can a beginner team do all this without the terminal?",
    answer:
      "Yes. GitHub’s website can create branches, edit files and handle pull requests, and GitHub Desktop is a free app for commits, pushes and pulls on your computer. CoCommit, which we make, puts these steps behind plain-named buttons and keeps the team’s chat, calls, files, tasks and notes next to the code.",
    more: [
      "In the browser, CoCommit lets you pick a repository and branch, edit a file, commit (to a new branch if you like) and open a pull request; those commits and pull requests show up in team chat, and GitHub’s errors are explained in plain words. The desktop app for Windows and macOS can also commit, pull and push on a folder on your computer, with your own git. It’s free, and everything it does is ordinary git, so the terminal still works whenever someone wants it.",
    ],
  },
];

// Words as a reader counts them (punctuation like `!` and `->` doesn't count; "fix-signup-email" is one word).
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

// All the guide's text, in reading order: headings, answers, extra paragraphs and steps.
export function guideText(): string {
  return [GUIDE_HEADING, GUIDE_INTRO, ...GUIDE_SECTIONS.flatMap((s) => [s.question, s.answer, ...(s.more ?? []), ...(s.steps ?? [])])].join("\n");
}

// Structured data for the guide (schema.org Article). The organization @id matches the landing page's graph.
export function guideJsonLd() {
  const url = `${SITE_URL}${GUIDE_PATH}`;
  const org = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon/512` };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    url,
    mainEntityOfPage: url,
    image: `${SITE_URL}/opengraph-image`,
    datePublished: GUIDE_PUBLISHED,
    dateModified: GUIDE_MODIFIED,
    inLanguage: "en",
    wordCount: countWords(guideText()),
    author: org,
    publisher: org,
  };
}
