"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { detectOs, downloads, type OsId } from "@/lib/downloads";

const base =
  "inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-semibold outline-accent focus-visible:outline-2 focus-visible:outline-offset-2";

// Landing-page download links: the visitor's own OS first, every platform listed.
// A platform without a committed installer shows as "coming soon".
export function Downloads() {
  const [os, setOs] = useState<OsId | null>(null);
  useEffect(() => setOs(detectOs(navigator.userAgent)), []);

  const ordered = [...downloads].sort((a, b) => Number(b.id === os) - Number(a.id === os));
  return (
    <div className="flex flex-wrap gap-3">
      {ordered.map((d, i) =>
        d.href ? (
          <a
            key={d.id}
            href={d.href}
            download
            className={`${base} ${i === 0 ? "bg-fg text-bg hover:opacity-90" : "border border-line bg-surface hover:bg-line/60"}`}
          >
            Download for {d.label}
          </a>
        ) : (
          <span key={d.id} aria-disabled="true" className={`${base} cursor-not-allowed border border-dashed border-line text-muted`}>
            {d.label}: coming soon
          </span>
        ),
      )}
    </div>
  );
}

// The hero's download link: names the visitor's OS when there's an installer for it.
export function HeroDownload() {
  const [os, setOs] = useState<OsId | null>(null);
  useEffect(() => setOs(detectOs(navigator.userAgent)), []);

  const mine = downloads.find((d) => d.id === os && d.href);
  const cls = `${base} border border-line bg-surface hover:bg-line/60`;
  return mine?.href ? (
    <a href={mine.href} download className={cls}>
      Download for {mine.label}
    </a>
  ) : (
    <a href="#download" className={cls}>
      Get the desktop app
    </a>
  );
}

// The desktop app loads the site root; send it straight into the app.
export function DesktopRedirect() {
  const router = useRouter();
  useEffect(() => {
    if ("__TAURI_INTERNALS__" in window) router.replace("/home");
  }, [router]);
  return null;
}
