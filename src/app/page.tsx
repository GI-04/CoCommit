import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import { Icon, type IconName } from "@/components/icons";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { DesktopRedirect, Downloads, HeroDownload } from "@/components/landing/Downloads";

// HeroDemo's terminal reads --font-mono.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "CoCommit: git, with buttons",
  description:
    "CoCommit turns commits, pulls, pushes and pull requests into buttons, with team chat, files and shared AI context in the same window. Built for small teams and first-time coders.",
};

const focus = "outline-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2";
const blueButton = `inline-flex items-center justify-center rounded-xl bg-[var(--blue)] px-6 py-3 text-base font-medium text-white hover:opacity-90 ${focus}`;
const heading = "text-center text-[32px] font-semibold leading-tight md:text-[44px]";

// The four colour cards of "Everything in one place" (Figma "Landing").
const features: { title: string; body: string; icon: IconName; tone: "green" | "cyan" | "pink" | "mustard" }[] = [
  { title: "See changes at a glance", body: "Green plus, red minus. Every file marked Added, Modified or Deleted.", icon: "branch", tone: "green" },
  { title: "Talk where the work is", body: "Pin a message, mark a decision or flag a gotcha with one tap.", icon: "message", tone: "cyan" },
  { title: "Share files, not links", body: "Drive keeps files next to your repo and chat so nothing gets lost.", icon: "folder", tone: "pink" },
  { title: "Hand off with context", body: "Instructions, decisions and gotchas for the next person or AI agent.", icon: "bot", tone: "mustard" },
];

const steps = [
  ["Connect your repo", "Sign in with GitHub and pick a repository."],
  ["Work in one place", "Review changes, chat and share files together."],
  ["Hand off with context", "Leave notes for your team and your AI agent."],
];

const workflow = [
  ["Asking “did you push yet?” in Discord", "Pushes and merges show up in team chat"],
  ["Pasting git commands from a tutorial", "Commit, pull, push and open pull requests with buttons"],
  ["“! [rejected] main -> main (fetch first)”", "Plain words: “main has 2 new commits. Get the latest first.”"],
  ["Re-explaining the project to every AI chat", "One shared context that every teammate’s AI agent reads"],
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
    <div className={`${mono.variable} text-fg`}>
      <DesktopRedirect />

      <header className="sticky top-0 z-30 px-3 pt-3 md:px-8 md:pt-5">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/" aria-label="CoCommit home" className={`rounded text-white ${focus}`}>
            <img src="/logo.svg" alt="" className="h-9 w-auto invert md:h-11" />
          </Link>
          <nav aria-label="Landing page" className="glass mx-auto hidden gap-1 rounded-full p-1.5 text-sm font-medium md:flex">
            {[
              ["#features", "Features"],
              ["#how", "How it works"],
              ["#download", "Download"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className={`rounded-full px-4 py-2 text-white/90 hover:bg-white/10 ${focus}`}>
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link href="/login?returnTo=/home" className={`glass hidden rounded-full px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 sm:block ${focus}`}>
              Sign in
            </Link>
            <Link href="/home" className={`rounded-full bg-[var(--blue)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 ${focus}`}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <section className="pt-14 text-center md:pt-20" aria-labelledby="intro">
          <p className="rise glass mx-auto inline-block rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/90">Now in early access</p>
          <h1 id="intro" className="rise mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.02em] md:text-7xl">
            Git, with buttons.
          </h1>
          <p className="rise mx-auto mt-5 max-w-xl text-lg text-muted [--d:90ms] md:text-xl">
            Commit, branch and share what you know with your team and your AI agents. No terminal needed.
          </p>
          <div className="rise mt-8 flex flex-wrap justify-center gap-3 [--d:160ms]">
            <Link href="/home" className={blueButton}>
              Get started
            </Link>
            <HeroDownload />
          </div>
          <div className="rise glass mt-12 rounded-3xl p-3 text-left [--d:240ms] md:mt-16 md:p-5">
            <HeroDemo />
          </div>
          <p className="mt-3 text-sm text-muted">The same push, both ways. The CoCommit side is clickable.</p>
        </section>

        <section id="features" className="reveal scroll-mt-24 pt-24 md:pt-32" aria-labelledby="features-title">
          <h2 id="features-title" className={heading}>
            Everything in one place.
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <li key={f.title} className={`block-${f.tone} reveal lift flex min-h-[13rem] flex-col gap-3 p-5`}>
                <span className="grid size-11 place-items-center rounded-full border border-black bg-paper">
                  <Icon name={f.icon} />
                </span>
                <h3 className="text-lg font-semibold leading-snug">{f.title}</h3>
                <p className="text-sm leading-relaxed">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="reveal pt-24 md:pt-32" aria-labelledby="why-title">
          <h2 id="why-title" className={heading}>
            One window instead of three.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted">Most student teams run on a chat app, a GitHub repo and a terminal that one person understands. Here’s the diff.</p>
          <div className="bg-surface mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-line text-[15px] md:text-base">
            {workflow.map(([before, after]) => (
              <div key={before} className="border-b border-black/20 last:border-b-0">
                <p className="flex gap-3 bg-removed/10 px-4 py-2.5">
                  <span aria-hidden className="w-3 shrink-0 font-semibold text-removed">−</span>
                  <span className="sr-only">Before:</span>
                  <span className="line-through decoration-removed/50">{before}</span>
                </p>
                <p className="flex gap-3 bg-added/15 px-4 py-2.5">
                  <span aria-hidden className="w-3 shrink-0 font-semibold text-added">+</span>
                  <span className="sr-only">With CoCommit:</span>
                  <span>{after}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-24 pt-24 md:pt-32" aria-labelledby="how-title">
          <h2 id="how-title" className={heading}>
            Three steps. No terminal.
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(([title, text], i) => (
              <li key={title} className="bg-surface reveal lift rounded-2xl border border-line p-6">
                <span className="grid size-9 place-items-center rounded-full border border-black bg-cyan text-sm font-semibold">{i + 1}</span>
                <p className="mt-4 text-lg font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="faq" className="reveal scroll-mt-24 pt-24 md:pt-32" aria-labelledby="faq-title">
          <h2 id="faq-title" className={heading}>
            Questions.
          </h2>
          <div className="bg-surface mx-auto mt-10 max-w-3xl divide-y divide-black/20 rounded-2xl border border-line px-6">
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
        </section>

        <section id="download" className="scroll-mt-24 pt-24 md:pt-32" aria-labelledby="download-title">
          <div className="block-cyan reveal px-6 py-12 text-center md:py-16">
            <h2 id="download-title" className="text-[40px] font-semibold leading-tight md:text-5xl">
              Get CoCommit.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base md:text-lg">Use it in your browser or install the desktop app. On a phone, open the web app and add it to your home screen.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/home" className={blueButton}>
                Get started
              </Link>
              <Downloads />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pb-10 pt-2 text-sm text-muted md:px-8">
        <img src="/logo.svg" alt="CoCommit" className="h-7 w-auto invert" />
        <span>Made for a hackathon, 2026.</span>
        <Link href="/home" className={`ml-auto rounded hover:text-fg ${focus}`}>
          Open the app
        </Link>
        <Link href="/login?returnTo=/home" className={`rounded hover:text-fg ${focus}`}>
          Sign in
        </Link>
      </footer>
    </div>
  );
}
