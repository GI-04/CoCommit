"use client";

import { useEffect, useRef, useState } from "react";
import { takeSignIn } from "@/lib/desktop-login";

// Desktop app, last step of GitHub sign-in: /auth/desktop/finish sends the app window here with the ticket. This page
// adds the verifier the window kept when the sign-in started and asks the server to swap both for a session
// (PLAN/2026-10-19-security-fixes.md, item 1). Reads the address itself, once, and then takes the ticket out of it.
export default function DesktopConfirmPage() {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ticket = new URLSearchParams(window.location.search).get("ticket");
    window.history.replaceState(null, "", "/auth/desktop/confirm");
    const verifier = takeSignIn();
    if (!ticket || !verifier) {
      setError("This sign-in didn't start in this app window, or it took too long. Log in again from the app.");
      return;
    }
    fetch("/auth/desktop/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket, verifier }) })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { next?: unknown; error?: unknown } | null;
        if (res.ok && typeof data?.next === "string") window.location.replace(data.next);
        else setError(typeof data?.error === "string" ? data.error : "Couldn't finish signing in. Log in again from the app.");
      })
      .catch(() => setError("Couldn't finish signing in. Check your connection and log in again."));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">{error ? "Sign-in not finished" : "Finishing sign-in…"}</h1>
      {error && (
        <>
          <p className="text-sm text-muted">{error}</p>
          <a href="/login" className="underline">Back to log in</a>
        </>
      )}
    </main>
  );
}
