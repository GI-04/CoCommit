import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { Branch, Commit } from "@/components/landing/Rail";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { DesktopRedirect, Downloads, HeroDownload } from "@/components/landing/Downloads";

const display = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CoCommit: git without the terminal",
  description:
    "CoCommit turns commits, pulls, pushes and pull requests into buttons, with team chat and shared AI context in the same window. Built for small teams and first-time coders.",
};

const focus = "outline-accent focus-visible:outline-2 focus-visible:outline-offset-2";
const primary = `inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-base font-semibold text-accent-fg hover:opacity-90 ${focus}`;
const h2 = "text-3xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl";
const h3 = "text-2xl font-bold tracking-[-0.02em] md:text-3xl";
const lead = "mt-5 max-w-[60ch] text-lg leading-relaxed text-muted md:text-xl";

function Logo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 text-accent-soft">
      <path d="M6 4v16M6 8c0 5 12 3 12 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="6" cy="20" r="2.5" fill="currentColor" />
      <circle cx="18" cy="16" r="2.5" fill="currentColor" />
      <circle cx="6" cy="4" r="2.5" fill="currentColor" />
    </svg>
  );
}

const workflow = [
  ["Asking “did you push yet?” in Discord", "Pushes and merges show up in team chat"],
  ["Pasting git commands from a tutorial", "Commit, pull, push and open pull requests with buttons"],
  ["“! [rejected] main -> main (fetch first)”", "Plain words: “main has 2 new commits. Get the latest first.”"],
  ["Re-explaining the project to every AI chat", "One shared context that every teammate’s AI agent reads"],
];

function RepoMock() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-sm">
      <div className="mb-3 flex gap-2">
        <span className="rounded-md border border-line px-2 py-1">team/app</span>
        <span className="rounded-md border border-line px-2 py-1">fix-navbar</span>
      </div>
      {[
        ["src/components/Navbar.tsx", 4, 2],
        ["src/styles/nav.css", 1, 1],
        ["README.md", 3, 0],
      ].map(([p, a, d]) => (
        <p key={p} className="flex items-center gap-2 border-t border-line py-2">
          <span aria-hidden className="size-3.5 rounded-sm bg-accent" />
          <span className="min-w-0 flex-1 truncate">{p}</span>
          <span className="text-added">+{a}</span>
          <span className="text-removed">−{d}</span>
        </p>
      ))}
      <div className="mt-2 flex gap-2">
        <span className="rounded-md bg-accent px-3 py-1.5 font-semibold text-accent-fg">Commit 3 files</span>
        <span className="rounded-md border border-line px-3 py-1.5 font-semibold">Open pull request</span>
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
      <p className="self-start rounded-md bg-fg/10 px-2 py-1 text-xs text-muted">Kin merged “Add sign-in page” into main</p>
      <div>
        <p className="font-semibold">Mina</p>
        <p>Let’s keep Supabase for chat and stop testing Firebase.</p>
      </div>
      <div className="self-start rounded-lg border border-line bg-bg p-2 shadow-sm">
        <p className="rounded px-2 py-1 font-semibold text-accent-soft">Pin as decision</p>
        <p className="rounded px-2 py-1 text-muted">Pin as gotcha</p>
      </div>
      <p className="self-start rounded-md bg-added/15 px-2 py-1 text-xs">Saved to COCOMMIT/DECISIONS.md</p>
    </div>
  );
}

function ContextMock() {
  const tree = ["CONTEXT.md", "PROJECT.md", "DECISIONS.md", "GOTCHAS.md", "LOG.md", "TODO.md", "BOARD/"];
  return (
    <div className="rounded-xl border border-line bg-[#161821] p-4 font-[family-name:var(--font-mono)] text-[13px] leading-7 text-[#cfd3de]">
      <p className="text-white">COCOMMIT/</p>
      {tree.map((f, i) => (
        <p key={f}>
          <span className="text-[#6b7186]">{i === tree.length - 1 ? "└── " : "├── "}</span>
          {f}
        </p>
      ))}
    </div>
  );
}

const features = [
  {
    title: "Commit with buttons",
    body: "Pick what changed, write one line about it and press Commit. Pull, push and open a pull request the same way. On the web it works through GitHub; the desktop app works on the copy of the repo on your computer.",
    mock: <RepoMock />,
  },
  {
    title: "Chat that knows about your repo",
    body: "Talk with your team next to the code, and see pushes and merges as they happen. Pin a message as a decision or a gotcha and it’s saved to the repo, so nobody digs through scrollback for it later.",
    mock: <ChatMock />,
  },
  {
    title: "One context for every AI agent",
    body: "Set up a COCOMMIT folder in your repo with the project summary, decisions, gotchas and recent activity. Whatever AI tool each teammate uses, it starts from the same plain Markdown files.",
    mock: <ContextMock />,
  },
];

const coming = [
  ["Tasks", "Assign work and track it next to the commits that finish it."],
  ["Files", "Share designs and documents without a separate drive."],
  ["Calls", "Start a voice call from team chat."],
];

const steps = [
  ["Sign in with GitHub", "Your repositories come with you. Nothing to install to start."],
  ["Pick a repo", "Choose one from GitHub, or open a folder on your computer in the desktop app."],
  ["Make your first commit", "Change something, write what you did, press Commit. Then push."],
];

const faq = [
  [
    "Do I need to know git?",
    "No. Every action is a button with a plain name. Underneath it’s ordinary git, so your repo works with the terminal and every other git tool whenever you want them.",
  ],
  ["Does CoCommit replace GitHub?", "No. Your code stays in your GitHub repositories. CoCommit is a simpler way to work with them, with chat and shared context added."],
  ["Which AI tools can read the shared context?", "Any tool that can read files in your repo. The context is plain Markdown in a COCOMMIT folder."],
  ["Does it work on my phone?", "Yes. Open the web app in your phone’s browser and add it to your home screen."],
];

export default function Landing() {
  return (
    <div className={`${display.variable} ${mono.variable} font-[family-name:var(--font-display)] text-fg`}>
      <DesktopRedirect />

      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-8">
          <Link href="/" className={`flex items-center gap-2 rounded text-lg font-bold tracking-tight ${focus}`}>
            <Logo />
            CoCommit
          </Link>
          <nav aria-label="Landing page" className="hidden gap-6 text-sm text-muted md:flex">
            <a href="#features" className={`rounded hover:text-fg ${focus}`}>Features</a>
            <a href="#how" className={`rounded hover:text-fg ${focus}`}>How it works</a>
            <a href="#download" className={`rounded hover:text-fg ${focus}`}>Download</a>
            <a href="#faq" className={`rounded hover:text-fg ${focus}`}>FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login?returnTo=/home" className={`hidden rounded-lg px-3 py-2 text-sm font-semibold hover:bg-fg/10 sm:block ${focus}`}>
              Sign in
            </Link>
            <Link href="/home" className={`rounded-lg bg-fg px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 ${focus}`}>
              Open CoCommit
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-16 md:px-8 md:pt-24">
        <Commit node="head" size="text-5xl md:text-7xl lg:text-8xl" first label="Introduction">
          <h1 className="max-w-[12ch] text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] md:text-7xl lg:text-8xl">
            Git, without the terminal.
          </h1>
          <p className={lead}>
            CoCommit turns commits, pulls, pushes and pull requests into buttons, and puts your team’s chat and AI context in the same window.
            Built for small teams and people making their first commit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/home" className={primary}>
              Open CoCommit
            </Link>
            <HeroDownload />
          </div>
          <div className="mt-14 md:mt-20">
            <HeroDemo />
            <p className="mt-3 text-sm text-muted">The same push, both ways. The CoCommit side is clickable.</p>
          </div>
        </Commit>

        <Commit label="Why CoCommit">
          <h2 className={h2}>One window instead of three.</h2>
          <p className={lead}>Most student teams run on a chat app, a GitHub repo and a terminal that one person understands. Here’s the diff.</p>
          <div className="mt-10 overflow-hidden rounded-xl border border-line bg-surface text-[15px] md:text-base">
            {workflow.map(([before, after]) => (
              <div key={before} className="border-b border-line last:border-b-0">
                <p className="flex gap-3 bg-removed/[0.07] px-4 py-2.5 text-muted">
                  <span aria-hidden className="w-3 shrink-0 font-semibold text-removed">−</span>
                  <span className="sr-only">Before:</span>
                  <span className="line-through decoration-removed/40">{before}</span>
                </p>
                <p className="flex gap-3 bg-added/[0.08] px-4 py-2.5">
                  <span aria-hidden className="w-3 shrink-0 font-semibold text-added">+</span>
                  <span className="sr-only">With CoCommit:</span>
                  <span>{after}</span>
                </p>
              </div>
            ))}
          </div>
        </Commit>

        <Commit id="features" label="Features">
          <h2 className={h2}>Everything your team does around the code.</h2>
          <p className={lead}>Three screens cover the day: the repo, the chat and the shared context.</p>
        </Commit>

        {features.map((f) => (
          <Commit key={f.title} size="text-2xl md:text-3xl" label={f.title}>
            <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
              <div>
                <h3 className={h3}>{f.title}</h3>
                <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-muted">{f.body}</p>
              </div>
              {f.mock}
            </div>
          </Commit>
        ))}

        <Branch label="Coming next">
          <h2 className={h2}>Coming next.</h2>
          <p className={lead}>These are on their own branch for now. They merge into the same window when they’re ready.</p>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3">
            {coming.map(([name, text]) => (
              <div key={name} className="border-l-2 border-added/50 pl-4">
                <dt className="text-lg font-bold">{name}</dt>
                <dd className="mt-1 text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </Branch>

        <Commit id="how" label="How it works">
          <h2 className={h2}>Your first commit in three steps.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(([title, text], i) => (
              <li key={title}>
                <span className="flex size-9 items-center justify-center rounded-full bg-accent/10 font-bold text-accent-soft">{i + 1}</span>
                <p className="mt-4 text-xl font-bold">{title}</p>
                <p className="mt-2 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </Commit>

        <Commit id="download" label="Download">
          <h2 className={h2}>On your laptop and your phone.</h2>
          <p className={lead}>
            The desktop app is the full CoCommit plus your local folders. On a phone, open the web app and add it to your home screen.
          </p>
          <div className="mt-8">
            <Downloads />
          </div>
        </Commit>

        <Commit id="faq" label="Questions">
          <h2 className={h2}>Questions.</h2>
          <div className="mt-8 max-w-3xl divide-y divide-line border-y border-line">
            {faq.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded text-lg font-semibold ${focus}`}>
                  {q}
                  <span aria-hidden className="text-2xl leading-none text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[65ch] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Commit>

        <Commit node="merge" last label="Get started">
          <div className="pb-28 md:pb-40">
            <h2 className="max-w-[16ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] md:text-6xl">Make your team’s first commit together.</h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/home" className={primary}>
                Open CoCommit
              </Link>
              <Link href="/login?returnTo=/home" className={`inline-flex items-center justify-center rounded-lg border border-line bg-surface px-5 py-3 text-base font-semibold hover:bg-fg/10 ${focus}`}>
                Sign in with GitHub
              </Link>
            </div>
          </div>
        </Commit>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-muted md:px-8">
          <span className="flex items-center gap-2 font-semibold text-fg">
            <Logo />
            CoCommit
          </span>
          <span>Made for a hackathon, 2026.</span>
          <Link href="/home" className={`ml-auto rounded hover:text-fg ${focus}`}>Open the app</Link>
          <Link href="/login?returnTo=/home" className={`rounded hover:text-fg ${focus}`}>Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
