// Facts about the public site used in <head> tags, structured data, robots.txt, sitemap.xml, llms.txt and the share
// image (PLAN/2026-10-18-seo-pass.md, PLAN/2026-10-21-seo-geo.md). Only "/" and "/legal" are meant for search engines; every other page is noindex.

export const SITE_URL = "https://cocommit.vercel.app";
export const SITE_NAME = "CoCommit";
export const REPO_URL = "https://github.com/GI-04/CoCommit";

// Landing <title>. "cocommit" is also the name of other git tools, so the title says which one this is
// (PLAN/2026-10-21-seo-geo.md).
export const LANDING_TITLE = "CoCommit: git with buttons for beginner teams";

// The one-sentence answer to "what is CoCommit?": the landing hero, the FAQ and llms.txt all use it.
export const DEFINITION =
  "CoCommit is a free git app for beginner teams: commit, push and open pull requests with buttons, and share what you know with your team and your AI agents.";

// Search Console / Bing Webmaster Tools ownership codes (the `content` of their <meta> tag). Public by design;
// leave empty until the site is added there, and nothing is printed.
export const GOOGLE_SITE_VERIFICATION: string = "";
export const BING_SITE_VERIFICATION: string = "";

// Google shows about 155 characters; keep this under that.
export const LANDING_DESCRIPTION =
  "Git without the terminal: commit, push and open pull requests with buttons, plus team chat, files and shared AI context. For small teams and beginners.";

// The pages listed in sitemap.xml and opted back in to indexing.
export const PUBLIC_PATHS = ["/", "/legal"] as const;

// Same colours as globals.css (--canvas, --blue, the four colour blocks).
export const BRAND = {
  canvas: "#1f1f1f",
  blue: "#1f4ae0",
  muted: "#b0b0b0",
  blocks: ["#ff79bf", "#00a9d8", "#d8a500", "#68ca27"],
} as const;

// The landing FAQ, also sent as FAQPage data and in llms.txt. Answers must stay true (fees: docs/LEGAL.md "Fees").
export const FAQ: [question: string, answer: string][] = [
  [
    "What is CoCommit?",
    "CoCommit is a free web and desktop app that makes git easy for beginner teams. You commit, pull, push and open pull requests on your GitHub repositories with buttons, and your team chat, calls, shared files, task board and AI context sit next to the code.",
  ],
  [
    "Is CoCommit free?",
    "Yes. CoCommit is currently free in the browser and as a desktop app for Windows and macOS. You need a GitHub account to work with your repositories.",
  ],
  [
    "How is CoCommit different from GitHub Desktop?",
    "GitHub Desktop is a git app for your own computer. CoCommit covers the same everyday steps (commit, pull, push, pull requests) in plain words and adds the team around them: pushes and merges show up in team chat, and files, tasks, calls and a shared AI context live in the same window. It also runs in the browser, so teammates can join without installing anything.",
  ],
  [
    "Do I need to know git?",
    "No. Every action is a button with a plain name. Underneath it’s ordinary git, so your repo works with the terminal and every other git tool whenever you want them.",
  ],
  ["Does CoCommit replace GitHub?", "No. Your code stays in your GitHub repositories. CoCommit is a simpler way to work with them, with chat and shared context added."],
  ["Which AI tools can read the shared context?", "Any tool that can read files in your repo. The context is plain Markdown in a COCOMMIT folder."],
  ["Does it work on my phone?", "Yes. Open the web app in your phone’s browser and add it to your home screen."],
];

// Structured data for the landing page (schema.org): who makes it, the site, the app and the FAQ, linked by @id.
// Only facts that are true today.
export function landingJsonLd() {
  const org = `${SITE_URL}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": org, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon/512`, sameAs: [REPO_URL] },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: LANDING_DESCRIPTION, inLanguage: "en", publisher: { "@id": org } },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFINITION,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web, Windows, macOS",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@id": org },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  };
}

// /llms.txt: a plain summary for AI search tools (llmstxt.org format).
export function llmsTxt(): string {
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${DEFINITION}`,
    "",
    `${SITE_NAME} is a web app at ${SITE_URL} with desktop apps for Windows and macOS. It is not related to the \`cocommit\` command-line tools for co-authored commits.`,
    "",
    "## Features",
    "- Git with buttons: commit, pull, push, branches and pull requests on GitHub repositories, with git errors explained in plain words.",
    "- Team chat where pushes and merges show up, with pins for decisions and gotchas.",
    "- Calls (voice, video, screen share), a shared Drive for files, and a task board.",
    "- Shared AI context: a COCOMMIT folder of plain Markdown that every teammate's AI agent can read, plus a built-in Assistant.",
    "- Runs in the browser; the desktop app can also work on a local folder with your own git.",
    "",
    "## FAQ",
    ...FAQ.flatMap(([q, a]) => ["", `### ${q}`, a]),
    "",
    "## Links",
    `- [Website](${SITE_URL}): what CoCommit is, download links`,
    `- [Legal](${SITE_URL}/legal): privacy policy, terms of service, cookies`,
    `- [Source code](${REPO_URL}): the GitHub repository`,
    "",
  ].join("\n");
}

// Base Open Graph fields. A page that sets its own `openGraph` replaces the parent's, so it spreads this first.
export const openGraphBase = { siteName: SITE_NAME, type: "website", locale: "en_US" } as const;
