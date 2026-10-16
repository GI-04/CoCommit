"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Last step of GitHub sign-in for the desktop app: this page opens in the system browser and hands the ticket to the
// installed app through the cocommit:// link (PLAN/2026-10-16-desktop-github-login.md).
function Handoff() {
  const ticket = useSearchParams().get("ticket");
  const link = ticket ? `cocommit://auth?ticket=${encodeURIComponent(ticket)}` : null;

  useEffect(() => {
    if (link) window.location.href = link;
  }, [link]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">{link ? "Signed in. Opening CoCommit…" : "This sign-in link is not valid."}</h1>
      {link ? (
        <>
          <p className="text-sm text-muted">If the app does not open, click the button. You can close this tab afterwards.</p>
          <a href={link} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Open CoCommit</a>
        </>
      ) : (
        <a href="/login" className="underline">Back to log in</a>
      )}
    </main>
  );
}

export default function DesktopHandoffPage() {
  return (
    <Suspense>
      <Handoff />
    </Suspense>
  );
}
