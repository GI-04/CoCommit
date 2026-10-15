"use client";

import { useEffect, useState } from "react";
import { detectOs, downloads, type Download, type OsId } from "@/lib/downloads";

const base = "block rounded-md px-3 py-2 text-center text-sm font-medium";

function Option({ item, primary }: { item: Download; primary: boolean }) {
  if (!item.href) {
    return (
      <span aria-disabled="true" className={`${base} cursor-not-allowed border border-line text-muted`}>
        {item.label}: coming soon
      </span>
    );
  }
  return (
    <a
      href={item.href}
      download
      className={`${base} ${primary ? "bg-accent text-accent-fg" : "border border-line hover:bg-fg/10"}`}
    >
      Download for {item.label}
    </a>
  );
}

export function DownloadButton({ className = "" }: { className?: string }) {
  const [os, setOs] = useState<OsId | null | undefined>(undefined);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp("__TAURI_INTERNALS__" in window);
    setOs(detectOs(navigator.userAgent));
  }, []);

  // Wait for the browser check, and skip it inside the desktop app itself.
  if (os === undefined || inApp) return null;

  const mine = downloads.find((d) => d.id === os);
  const shown = mine ? [mine] : downloads;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {shown.map((d) => (
        <Option key={d.id} item={d} primary />
      ))}
      {mine?.id === "macos" && mine.href && (
        <p className="text-xs text-muted">
          If macOS says it can't be opened, run <code>xattr -cr /Applications/CoCommit.app</code> once in Terminal.
        </p>
      )}
      {mine?.id === "windows" && mine.href && (
        <p className="text-xs text-muted">
          If Windows says &ldquo;unknown publisher&rdquo;, choose <strong>More info</strong> → <strong>Run anyway</strong>.
        </p>
      )}
    </div>
  );
}
