"use client";

import Link from "next/link";
import { useState } from "react";
import { signInWithEmail, signUpWithEmail, MIN_PASSWORD_LENGTH } from "@/lib/auth-email";
import { Button } from "@/components/ui";

type Mode = "login" | "signup";

const input = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm disabled:opacity-50";

// Email and password option on /login (Figma "Auth · Welcome back" and "Auth · Create account").
// The helpers in src/lib/auth-email.ts return { error } with a message people can act on, so it is shown as is.
export function EmailLogin({ returnTo, available }: { returnTo: string; available: boolean }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !available) return;
    setBusy(true);
    setError(null);
    if (mode === "login") {
      const { error } = await signInWithEmail(email, password);
      if (error) setError(error);
      // Full page load, so the new session cookie is sent and the proxy sees a signed-in user.
      else window.location.assign(returnTo);
    } else {
      const { error, needsConfirmation } = await signUpWithEmail(email, password, name, returnTo);
      if (error) setError(error);
      else if (needsConfirmation) setCheckEmail(true);
      else window.location.assign(returnTo);
    }
    setBusy(false);
  }

  if (checkEmail)
    return (
      <div className="rounded-md border border-line p-4">
        <h2 className="text-sm font-semibold">Check your email.</h2>
        <p className="mt-1 text-sm text-muted">We sent a link to {email.trim()}. Open it to finish creating your account.</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="rounded-md border border-line p-4">
      <div className="mb-4 flex gap-1 rounded-md bg-bg p-1 text-sm" role="tablist" aria-label="Email login">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded px-3 py-1.5 font-medium ${mode === m ? "bg-surface" : "text-muted hover:text-fg"}`}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      {!available && <p className="mb-3 text-xs text-muted">Email login: not set up yet.</p>}

      <div className="space-y-3">
        {mode === "signup" && (
          <div>
            <label htmlFor="login-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <input id="login-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!available} className={input} />
          </div>
        )}
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!available}
            className={input}
          />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            {mode === "login" && (
              <Link href="/login/forgot" className="text-xs text-muted underline hover:text-fg">
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!available}
            aria-describedby={mode === "signup" ? "login-password-hint" : undefined}
            className={input}
          />
          {mode === "signup" && (
            <p id="login-password-hint" className="mt-1 text-xs text-muted">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-removed">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy || !available} className="mt-4 w-full">
        {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </Button>
      <p className="mt-3 text-xs text-muted">Chat and files only. Sign in with GitHub to commit.</p>
    </form>
  );
}
