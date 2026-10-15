"use client";

import Link from "next/link";
import { useState } from "react";
import { sendPasswordReset } from "@/lib/auth-email";
import { Button } from "@/components/ui";

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
      <div className="mx-auto mt-16 max-w-sm rounded-lg border border-line bg-surface p-6">
        <h1 className="mb-1 text-2xl font-bold">Link sent.</h1>
        <p className="mb-6 text-sm text-muted">Check your inbox to reset your password.</p>
        <Link href="/login" className="inline-block rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
          Back to sign in
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm rounded-lg border border-line bg-surface p-6" noValidate>
      <h1 className="mb-1 text-2xl font-bold">Forgot password?</h1>
      <p className="mb-6 text-sm text-muted">Enter your e-mail and we will send you a link to reset it.</p>

      <label htmlFor="email" className="mb-1 block text-sm font-medium">
        E-mail
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "email-error" : undefined}
        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
      />
      {error && (
        <p id="email-error" role="alert" className="mt-2 text-sm text-removed">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href="/login" className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-line/60">
          Back
        </Link>
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send link"}
        </Button>
      </div>
    </form>
  );
}
