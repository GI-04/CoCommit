import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import type { Tone } from "@/components/ui";

// Full-screen layout of the Figma "Auth · …" frames: logo top-left and one big colour card in the middle.
// Used by /login, /login/forgot and /login/reset (the app navigation is hidden there, see AppShell).
export function AuthShell({ tone, title, subtitle, children }: { tone: Tone; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh px-4 pb-10 pt-6 md:px-16 md:pt-[58px]">
      <div className="flex items-center gap-4">
        <BackButton />
        <Link href="/" aria-label="CoCommit home page" className="inline-block text-white">
          <img src="/logo.svg" alt="" className="h-10 w-auto invert md:h-[78px]" />
        </Link>
      </div>
      <div className={`block-${tone} rise mx-auto mt-6 w-full max-w-[790px] p-6 md:-mt-2 md:px-[101px] md:py-14`}>
        <h1 className="text-center text-[32px] font-semibold leading-tight md:text-[48px]">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-base">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/legal" className="rounded underline underline-offset-2 outline-accent-soft hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2">
          Privacy, terms and cookies
        </Link>
      </p>
    </div>
  );
}

// Round paper field used on the auth cards.
export const authField = "h-[52px] w-full rounded-full border border-black bg-paper px-5 py-0 text-sm text-black placeholder:text-black/55 disabled:opacity-50";
// Back and Next buttons of the auth cards (paper and black).
export const authButtons = {
  back: "inline-flex h-[52px] flex-1 items-center justify-center rounded-xl border border-black bg-paper px-5 text-sm font-medium text-black hover:opacity-90",
  next: "inline-flex h-[52px] flex-1 items-center justify-center rounded-xl border border-black bg-black px-5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
};
