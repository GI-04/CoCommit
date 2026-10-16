"use client";

import Link from "next/link";
import { useState } from "react";
import { signInWithEmail, signUpWithEmail, MIN_PASSWORD_LENGTH } from "@/lib/auth-email";
import { authButtons, authField } from "@/components/AuthShell";
import { Tabs } from "@/components/ui";

type Mode = "login" | "signup";

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
      <div className="rounded-2xl border border-black bg-paper p-4 text-center">
        <h2 className="text-base font-semibold">Check your email.</h2>
        <p className="mt-1 text-sm">We sent a link to {email.trim()}. Open it to finish creating your account.</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      <Tabs
        variant="paper"
        size="sm"
        label="Email login"
        value={mode}
        onChange={(id) => switchMode(id as Mode)}
        tabs={[
          { id: "login", label: "Log in" },
          { id: "signup", label: "Sign up" },
        ]}
        className="mb-5"
      />

      {!available && <p className="mb-3 text-center text-sm">Email login: not set up yet.</p>}

      <div className="space-y-3">
        {mode === "signup" && (
          <>
            <label htmlFor="login-name" className="sr-only">
              Name
            </label>
            <input id="login-name" autoComplete="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={!available} className={authField} />
          </>
        )}
        <label htmlFor="login-email" className="sr-only">
          E-mail
        </label>
        <input id="login-email" type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!available} className={authField} />
        <label htmlFor="login-password" className="sr-only">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? `Password (at least ${MIN_PASSWORD_LENGTH} characters)` : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!available}
          className={authField}
        />
        {mode === "login" && (
          <p className="text-right text-sm">
            <Link href="/login/forgot" className="underline hover:no-underline">
              Forgot password?
            </Link>
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-medium text-removed">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy || !available} className={`${authButtons.next} mt-6 w-full`}>
        {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="mt-3 text-center text-sm">Email accounts can use chat. Repository, Tasks, Drive and Agent Context need GitHub: sign in with GitHub for those.</p>
    </form>
  );
}
