import { NextResponse } from "next/server";
import { GENERAL, isRepoName } from "@/lib/current-repo";
import { canSeeRepo } from "@/lib/github";
import { accessError } from "@/lib/repo-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";

// POST /api/chat/join {"repo":"owner/name"} → {ok: true} when GitHub lets you see the repo, else 403.
// Records you in repo_members (checked_at = now), which the chat table rules require for repo chats
// (supabase/repo-members.sql, PLAN/2026-10-16-repo-members-only.md). # general is open to every real account.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { repo?: unknown } | null;
  const repo = body?.repo;
  if (repo === GENERAL) return NextResponse.json({ ok: true });
  if (typeof repo !== "string" || !isRepoName(repo)) return NextResponse.json({ error: "Send the repo as owner/name." }, { status: 400 });

  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ ok: true }); // Demo mode: chat stays in this browser.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Log in to see and join the team chat." }, { status: 401 });

  let access;
  try {
    access = await canSeeRepo(repo);
  } catch {
    return NextResponse.json({ error: "Couldn't check this repo on GitHub. Try again in a moment." }, { status: 502 });
  }
  const closed = accessError(access);
  if (closed) return NextResponse.json(closed, { status: closed.status });

  // Without the service role key nothing is recorded; chat still works until supabase/repo-members.sql is run.
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: true, recorded: false });
  const { error } = await admin
    .from("repo_members")
    .upsert({ user_id: user.id, repo, checked_at: new Date().toISOString() }, { onConflict: "user_id,repo" });
  if (error) return NextResponse.json({ error: "Couldn't open this repo's chat. Try again in a moment." }, { status: 500 });
  return NextResponse.json({ ok: true, recorded: true });
}
