import Link from "next/link";
import { sections } from "@/lib/sections";
import { DownloadButton } from "@/components/DownloadButton";

export default function Home() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">CoCommit</h1>
      <p className="mb-8 text-muted">Git without the terminal, plus chat and one shared context for your team's AI agents.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-lg border border-line bg-surface p-4 hover:border-accent">
            <h2 className="mb-1 font-semibold">{s.label}</h2>
            <p className="text-sm text-muted">{s.blurb}</p>
          </Link>
        ))}
      </div>
      <DownloadButton className="mt-8 max-w-xs" />
    </div>
  );
}
