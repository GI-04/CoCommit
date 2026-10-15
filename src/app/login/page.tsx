"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSession, signInHref } from "@/lib/github-client";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

type Method = { available: boolean; reason?: string };

// Asks Supabase which login providers are switched on (public endpoint, needs only the anon key).
async function googleEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: key } });
  if (!res.ok) return false;
  const data = (await res.json()) as { external?: Record<string, boolean> };
  return Boolean(data.external?.google);
}

// Only same-site paths, so ?returnTo can't send people to another site.
const safePath = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/login") ? p : "/home");

function LoginCard() {
  const params = useSearchParams();
  const failed = params.get("error");
  const returnTo = safePath(params.get("returnTo"));
  const [github, setGithub] = useState<Method | null>(null);
  const [google, setGoogle] = useState<Method | null>(null);

  useEffect(() => {
    getSession()
      .then((s) => setGithub(s.fake ? { available: false, reason: "Not set up yet" } : { available: true }))
      .catch(() => setGithub({ available: false, reason: "Unavailable right now" }));
    if (!supabaseConfigured) setGoogle({ available: false, reason: "Not set up yet" });
    else
      googleEnabled()
        .then((on) => setGoogle(on ? { available: true } : { available: false, reason: "Not set up yet" }))
        .catch(() => setGoogle({ available: false, reason: "Unavailable right now" }));
  }, []);

  async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}` },
    });
  }

  const loading = !github || !google;
  const none = !loading && !github.available && !google.available;

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-line bg-surface p-6">
      <h1 className="mb-1 text-2xl font-bold">Log in to CoCommit</h1>
      <p className="mb-6 text-sm text-muted">Choose how you want to log in. CoCommit remembers you on this device.</p>

      {failed && <p className="mb-4 text-sm text-removed">Login failed. Please try again.</p>}

      <div className="space-y-3">
        <Option
          label="Continue with GitHub"
          hint="Recommended: needed for commits and pull requests"
          method={github}
          icon={<GitHubIcon />}
          href={signInHref(returnTo)}
        />
        <Option label="Continue with Google" hint="Chat and context only" method={google} icon={<GoogleIcon />} onClick={signInWithGoogle} />
      </div>

      {none && (
        <p className="mt-6 rounded-md border border-line p-3 text-sm text-muted">
          Demo mode: no login method is set up yet, so every screen is open without logging in.
        </p>
      )}
    </div>
  );
}

function Option(props: { label: string; hint: string; method: Method | null; icon: React.ReactNode; href?: string; onClick?: () => void }) {
  const { label, hint, method, icon, href, onClick } = props;
  const look = "flex w-full items-center gap-3 rounded-md border border-line px-4 py-3 text-left";
  const body = (
    <>
      <span className="h-5 w-5 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{method && !method.available ? method.reason : hint}</span>
      </span>
    </>
  );

  if (!method) return <div className={`${look} animate-pulse opacity-50`}>{body}</div>;
  if (!method.available)
    return (
      <div className={`${look} cursor-not-allowed opacity-50`} aria-disabled="true">
        {body}
      </div>
    );
  return href ? (
    <a href={href} className={`${look} hover:border-accent hover:bg-bg`}>
      {body}
    </a>
  ) : (
    <button onClick={onClick} className={`${look} hover:border-accent hover:bg-bg`}>
      {body}
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
