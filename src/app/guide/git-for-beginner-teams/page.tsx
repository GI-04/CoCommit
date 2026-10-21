import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { GetStarted } from "@/components/landing/GetStarted";
import {
  GUIDE_DESCRIPTION,
  GUIDE_HEADING,
  GUIDE_INTRO,
  GUIDE_MODIFIED,
  GUIDE_PATH,
  GUIDE_SECTIONS,
  GUIDE_TITLE,
  guideJsonLd,
} from "@/lib/guide";

// Public, full-screen guide (no sidebar, see AppShell) that search engines may index (PLAN/2026-10-21-seo-guide-page.md).
// The text lives in src/lib/guide.ts.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: GUIDE_PATH },
  // No `openGraph` here: setting it in a child segment drops the root share image (opengraph-image.tsx).
  // og:title and og:description are filled in from the title and description above.
};

const focus = "outline-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2";
const updated = new Date(`${GUIDE_MODIFIED}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Text in `backticks` is shown as code, without font ligatures so `->` looks the way git prints it.
function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") ? (
      <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.88em] text-white [font-variant-ligatures:none] [overflow-wrap:anywhere]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-dvh px-4 pb-20 pt-4 md:px-8 md:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd()).replace(/</g, "\\u003c") }} />
      <header className="mx-auto flex max-w-3xl items-center gap-3">
        <BackButton />
        <Link href="/" aria-label="CoCommit home page" className={`rounded text-white ${focus}`}>
          <img src="/logo.svg" alt="" className="h-9 w-auto invert md:h-11" />
        </Link>
        <Link href="/home" className={`glass ml-auto rounded-full px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 ${focus}`}>
          Open the app
        </Link>
      </header>

      <main className="mx-auto mt-10 max-w-3xl text-[15px] leading-7 text-white/85 md:mt-14 md:text-base md:leading-8">
        <article>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted">Guide</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">{GUIDE_HEADING}</h1>
          <p className="mt-3 text-sm text-muted">
            By the CoCommit team · Updated <time dateTime={GUIDE_MODIFIED}>{updated}</time>
          </p>
          <p className="mt-6 text-lg leading-8 text-white/90 md:text-xl md:leading-9">{GUIDE_INTRO}</p>

          <nav aria-label="On this page" className="mt-8 rounded-2xl border border-line p-5">
            <p className="text-sm font-semibold text-white">On this page</p>
            <ol className="mt-2 list-decimal space-y-1 pl-6 text-[15px] marker:text-muted">
              {GUIDE_SECTIONS.map((s) => (
                <li key={s.id} className="pl-1">
                  <a href={`#${s.id}`} className={`rounded underline decoration-white/30 underline-offset-4 hover:text-white hover:decoration-white ${focus}`}>
                    {s.question}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {GUIDE_SECTIONS.map((s) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id} className="mt-12 scroll-mt-6 text-2xl font-semibold leading-snug text-white md:text-3xl">
                {s.question}
              </h2>
              <p className="mt-4 text-white">
                <Inline text={s.answer} />
              </p>
              {s.more?.map((p) => (
                <p key={p} className="mt-4">
                  <Inline text={p} />
                </p>
              ))}
              {s.steps && (
                <ol className="mt-4 list-decimal space-y-2 pl-6 marker:text-muted">
                  {s.steps.map((step) => (
                    <li key={step} className="pl-1">
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </article>

        <aside aria-label="Try CoCommit" className="block-cyan mt-14 px-6 py-8 text-center md:py-10">
          <p className="text-2xl font-semibold leading-snug md:text-3xl">Try it with your team.</p>
          <p className="mx-auto mt-2 max-w-lg">CoCommit is free in the browser, with desktop apps for Windows and macOS. Sign in with GitHub and pick a repository.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <GetStarted className={`inline-flex items-center justify-center rounded-xl bg-[var(--blue)] px-6 py-3 text-base font-medium text-white hover:opacity-90 ${focus}`} />
            <Link href="/" className={`inline-flex items-center justify-center rounded-xl border border-black px-6 py-3 text-base font-medium hover:bg-black/10 ${focus}`}>
              What is CoCommit?
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
