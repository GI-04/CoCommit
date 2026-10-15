"use client";

import Link from "next/link";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH, updatePassword } from "@/lib/auth-email";
import { Button } from "@/components/ui";

const input = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm";
const card = "mx-auto mt-16 max-w-sm rounded-lg border border-line bg-surface p-6";

// Where the "reset your password" email link lands (sendPasswordReset → /auth/callback → here). The link has
// already signed the person in, so updatePassword only needs the new password.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password !== again) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.error) setDone(true);
    else {
      setError(result.error);
      setExpired(result.error.includes("expired"));
    }
  }

  if (done)
    return (
      <div className={card}>
        <h1 className="mb-1 text-2xl font-bold">Password updated.</h1>
        <p className="mb-6 text-sm text-muted">You can use the new password the next time you log in.</p>
        <Link href="/home" className="inline-block rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
          Continue
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className={card}>
      <h1 className="mb-1 text-2xl font-bold">Choose a new password.</h1>
      <p className="mb-6 text-sm text-muted">Use at least {MIN_PASSWORD_LENGTH} characters.</p>

      <div className="space-y-3">
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <input id="new-password" type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="new-password-again" className="mb-1 block text-sm font-medium">
            Type it again
          </label>
          <input id="new-password-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={input} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-removed">
          {error}
          {expired && (
            <>
              {" "}
              <Link href="/login/forgot" className="underline">
                Send a new link
              </Link>
            </>
          )}
        </p>
      )}

      <Button type="submit" disabled={busy} className="mt-6 w-full">
        {busy ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
