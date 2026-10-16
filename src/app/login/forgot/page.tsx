"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell, authButtons, authField } from "@/components/AuthShell";
import { sendPasswordReset } from "@/lib/auth-email";

// Figma "Auth · Forgot password" and "Auth · Link sent": ask for the email, then confirm the link is on its way.
// The email link signs the person in and opens /login/reset (see sendPasswordReset in src/lib/auth-email.ts).
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  if (sent)
    return (
      <AuthShell tone="green" title="Link sent." subtitle="Check your inbox to reset your password.">
        <div className="flex">
          <Link href="/login" className={authButtons.next}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );

  return (
    <AuthShell tone="mustard" title="Forgot password?" subtitle="Enter your e-mail and we will send you a link to reset it.">
      <form onSubmit={submit} noValidate>
        <label htmlFor="email" className="sr-only">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
          className={authField}
        />
        {error && (
          <p id="email-error" role="alert" className="mt-3 text-center text-sm font-medium text-removed">
            {error}
          </p>
        )}
        <div className="mt-8 flex gap-4">
          <Link href="/login" className={authButtons.back}>
            Back
          </Link>
          <button type="submit" disabled={busy} className={authButtons.next}>
            {busy ? "Sending…" : "Send link"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
