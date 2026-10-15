"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell, authButtons, authField } from "@/components/AuthShell";
import { MIN_PASSWORD_LENGTH, updatePassword } from "@/lib/auth-email";

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
      <AuthShell tone="green" title="Password updated." subtitle="You can use the new password the next time you log in.">
        <div className="flex">
          <Link href="/home" className={authButtons.next}>
            Continue
          </Link>
        </div>
      </AuthShell>
    );

  return (
    <AuthShell tone="pink" title="Choose a new password." subtitle={`Use at least ${MIN_PASSWORD_LENGTH} characters.`}>
      <form onSubmit={submit} noValidate>
        <div className="space-y-4">
          <label htmlFor="new-password" className="sr-only">
            New password
          </label>
          <input id="new-password" type="password" autoComplete="new-password" autoFocus placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={authField} />
          <label htmlFor="new-password-again" className="sr-only">
            Type it again
          </label>
          <input id="new-password-again" type="password" autoComplete="new-password" placeholder="Type it again" value={again} onChange={(e) => setAgain(e.target.value)} className={authField} />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-removed">
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
        <div className="mt-8 flex">
          <button type="submit" disabled={busy} className={authButtons.next}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
