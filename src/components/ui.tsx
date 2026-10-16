import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BackButton } from "@/components/BackButton";

export type Tone = "pink" | "cyan" | "mustard" | "green" | "paper" | "clay" | "dark";

// Page title row from the Figma frames: title on the left, optional tabs in the middle, actions on the right.
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <BackButton />
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[34px] text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}

// A card. With no `tone` it is a paper-white card; with a tone it is a colour block (pink, cyan, mustard, green);
// "dark" is the dark panel used for diffs.
export function Card({ title, children, className = "", tone }: { title?: string; children: ReactNode; className?: string; tone?: Tone }) {
  const look = tone === "dark" ? "rounded-lg border border-white/15 bg-white/[0.04] p-5" : tone ? `block-${tone} p-5` : "bg-surface rounded-lg border border-line p-5";
  return (
    <section className={`${look} ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "glass" | "blue" }) {
  const look =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : variant === "glass"
        ? "glass rounded-full px-4 text-white hover:bg-white/10"
        : variant === "blue"
          ? "rounded-full bg-[var(--blue)] px-5 text-white hover:opacity-90"
          : "border border-line hover:bg-fg/10";
  return (
    <button
      className={`rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
      {...props}
    />
  );
}

type Tab = { id: string; label: string };

// The glass tab pill from the Figma headers (in-page tabs; kept free of next/link so tests can load this file).
export function Tabs({ tabs, value, onChange, label, className = "" }: { tabs: Tab[]; value: string; onChange: (id: string) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={`glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 ${className}`}>
      {tabs.map((t) => {
        const active = t.id === value;
        const look = `shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium ${active ? "glass-thumb text-white" : "text-white/85 hover:bg-white/10"}`;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(t.id)} className={look}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// A small rounded label (counts, status, roles).
export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border border-black bg-paper px-2.5 py-0.5 text-xs font-medium text-black ${className}`}>{children}</span>;
}

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="max-w-xl">
      <PageHeader title={title} subtitle="Coming soon: not part of the hackathon demo." />
      <p className="text-muted">{blurb}</p>
    </div>
  );
}
