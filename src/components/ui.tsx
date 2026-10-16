import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BackButton } from "@/components/BackButton";

export type Tone = "pink" | "cyan" | "mustard" | "green" | "paper" | "clay" | "dark";

// Page title row from the Figma frames: title on the left, optional tabs in the middle, actions on the right.
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
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

type ButtonVariant = "primary" | "ghost" | "glass" | "blue";

// Every button is a pill. `glass` is the secondary button (same glass as the tabs and navigation), `blue` the main
// action, `primary` a solid pill (black inside colour cards), `ghost` an outlined one. Links that must look like a
// button (Invite, ...) use buttonClass() so they match.
export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  const look =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : variant === "glass"
        ? "btn-glass text-white"
        : variant === "blue"
          ? "btn-blue text-white"
          : "border border-line hover:bg-fg/10";
  return `rounded-full ${variant === "blue" ? "px-5" : "px-4"} py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

type Tab = { id: string; label: string };

// The glass tab pill from the Figma headers (in-page tabs; kept free of React and next/link imports so tests can load
// this file). Tabs are equal width and the glass thumb slides to the picked one with plain CSS.
// `variant="paper"` is the white track with a black thumb (inside cards and on the login screen); `size="sm"` is the
// small one for those places.
export function Tabs({
  tabs,
  value,
  onChange,
  label,
  className = "",
  variant = "glass",
  size = "md",
}: {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
  variant?: "glass" | "paper";
  size?: "md" | "sm";
}) {
  const index = tabs.findIndex((t) => t.id === value);
  const paper = variant === "paper";
  const small = size === "sm";
  return (
    <div className={`${paper ? "border border-black bg-paper" : "glass"} max-w-full overflow-x-auto rounded-full ${className}`}>
      <div role="tablist" aria-label={label} className={`relative inline-grid w-max min-w-full auto-cols-fr grid-flow-col p-[var(--pad)] ${small ? "[--pad:0.25rem]" : "[--pad:0.375rem] lg:[--pad:0.5rem]"}`}>
        <span
          aria-hidden
          className={`${paper ? "bg-black" : "glass-thumb"} pointer-events-none absolute bottom-[var(--pad)] left-[var(--pad)] top-[var(--pad)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${index < 0 ? "opacity-0" : ""}`}
          style={{ width: `calc((100% - 2 * var(--pad)) / ${tabs.length})`, transform: `translateX(${Math.max(index, 0) * 100}%)` }}
        />
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === value}
            tabIndex={t.id === value || (index < 0 && t.id === tabs[0]?.id) ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              const at = Math.max(index, 0);
              const to = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (at + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              onChange(tabs[to].id);
              e.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role=tab]")[to]?.focus();
            }}
            className={`relative z-10 whitespace-nowrap rounded-full font-medium ${small ? "px-4 py-1.5 text-sm" : `px-5 py-2.5 text-sm lg:px-8 lg:py-[17px] lg:text-base ${tabs.length <= 3 ? "lg:min-w-[11rem]" : ""}`} ${
              t.id === value ? "text-white" : paper ? "text-black hover:text-black/70" : "text-white/85 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A loading placeholder: a few shimmering bars (announced as "Loading" to screen readers).
export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="shimmer" style={{ display: "block", height: "1rem", width: `${100 - (i % 3) * 18}%` }} />
      ))}
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
