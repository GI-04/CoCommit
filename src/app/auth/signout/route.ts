import { NextResponse } from "next/server";
import { signOut as forgetGitHub } from "@/lib/github";
import { getSupabaseServer } from "@/lib/supabase-server";

// Form POST from the sidebar: sign out of everything (Supabase session and GitHub token), then /login.
export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  await forgetGitHub();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
