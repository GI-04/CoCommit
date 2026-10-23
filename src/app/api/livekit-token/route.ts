import { NextResponse } from "next/server";
import { isRepoName } from "@/lib/current-repo";
import { fakeMode, getSession, repoAccess } from "@/lib/github";
import { createToken, liveKitKeys, roomForRepo } from "@/lib/livekit-token";
import { accessError } from "@/lib/repo-access";
import { getSupabaseServer } from "@/lib/supabase-server";

// POST /api/livekit-token {"repo":"owner/name"} → {token, url, room} for that repo's call.
// Only signed-in people get a token (a real Supabase account or a GitHub session); anonymous visitors don't.
// And only members of the repo (PLAN/2026-10-16-repo-members-only.md); on a public repo that means people who work on it,
// not readers. The room is named by GitHub's repo id, not the name sent here (PLAN/2026-10-19-security-fixes.md, item 3).
export async function POST(req: Request) {
  const keys = liveKitKeys();
  if (!keys) return NextResponse.json({ error: "Calls aren't set up yet: the LiveKit keys are missing." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { repo?: unknown } | null;
  const repo = typeof body?.repo === "string" ? body.repo : null;
  if (!isRepoName(repo)) return NextResponse.json({ error: "Send the repo as owner/name." }, { status: 400 });

  const who = await caller();
  if (!who) return NextResponse.json({ error: "Log in to join the call." }, { status: 401 });

  const unreachable = () => NextResponse.json({ error: "Couldn't check this repo on GitHub. Try again in a moment." }, { status: 502 });
  let found;
  try {
    found = await repoAccess(repo);
  } catch {
    return unreachable();
  }
  const closed = accessError(found.access);
  if (closed) return NextResponse.json(closed, { status: closed.status });
  const room = roomForRepo(found.id);
  if (!room) return unreachable();

  return NextResponse.json({ token: createToken(keys, who, room), url: keys.url, room });
}

/** Who is asking, or null if nobody is signed in. Supabase account first, then the GitHub session. */
async function caller(): Promise<{ identity: string; name: string } | null> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (u && !u.is_anonymous) {
      const m = u.user_metadata ?? {};
      return { identity: `sb:${u.id}`, name: m.full_name || m.name || m.user_name || u.email?.split("@")[0] || "Teammate" };
    }
  }
  try {
    const s = await getSession();
    if (s.user && !s.fake) return { identity: `gh:${s.user.login}`, name: s.user.name || s.user.login };
  } catch {
    // GitHub unreachable: treat as signed out.
  }
  // Local dev with no accounts set up at all: let a guest in so the screen can be tried.
  if (!supabase && fakeMode) return { identity: `guest:${crypto.randomUUID().slice(0, 8)}`, name: "Guest" };
  return null;
}
