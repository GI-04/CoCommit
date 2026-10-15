import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-4 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const look =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : "border border-line hover:bg-line/60";
  return (
    <button
      className={`rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
      {...props}
    />
  );
}

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="max-w-xl">
      <PageHeader title={title} subtitle="Coming soon: not part of the hackathon demo." />
      <p className="text-muted">{blurb}</p>
    </div>
  );
}
