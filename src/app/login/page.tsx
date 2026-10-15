"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

function LoginCard() {
  const failed = useSearchParams().get("error");

  async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-line bg-surface p-6">
      <h1 className="mb-1 text-2xl font-bold">Sign in to CoCommit</h1>
      <p className="mb-6 text-sm text-muted">Use your Google account to join your team.</p>

      {failed && <p className="mb-4 text-sm text-removed">Sign-in failed. Please try again.</p>}

      {supabaseConfigured ? (
        <button
          onClick={signInWithGoogle}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Continue with Google
        </button>
      ) : (
        <p className="rounded-md border border-line p-3 text-sm text-muted">
          Demo mode: the Supabase keys are not set in <code>.env.local</code>, so sign-in is off and every screen is open.
        </p>
      )}

      <p className="mt-6 text-xs text-muted">
        Google signs you in to CoCommit. Connecting GitHub for commits and pull requests is a separate step inside the Repo screen.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
