import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Markdown } from "@/components/Markdown";

// Public, full-screen page (no sidebar, see AppShell). The text lives in docs/LEGAL.md and is read once at build time,
// so editing that file is the only way to change this page (PLAN/2026-10-16-legal-page.md).
export const dynamic = "force-static";

const focus = "outline-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2";

export default function LegalPage() {
  const source = readFileSync(path.join(process.cwd(), "docs", "LEGAL.md"), "utf8");
  return (
    <div className="min-h-dvh px-4 pb-20 pt-4 md:px-8 md:pt-6">
      <header className="mx-auto flex max-w-3xl items-center gap-3">
        <BackButton />
        <Link href="/" aria-label="CoCommit home page" className={`rounded text-white ${focus}`}>
          <img src="/logo.svg" alt="" className="h-9 w-auto invert md:h-11" />
        </Link>
        <Link href="/home" className={`glass ml-auto rounded-full px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 ${focus}`}>
          Open the app
        </Link>
      </header>
      <main className="mx-auto mt-10 max-w-3xl md:mt-14">
        <Markdown source={source} />
      </main>
    </div>
  );
}
