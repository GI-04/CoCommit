import { NextResponse } from "next/server";
import { canSeeRepoAs, fakeMode, getSession } from "@/lib/github";
import { createToken, liveKitKeys, roomForRepo } from "@/lib/livekit-token";
import { accessError } from "@/lib/repo-access";
import { getSupabaseServer } from "@/lib/supabase-server";

// POST /api/livekit-token {"repo":"owner/name"} → {token, url, room} for that repo's call.
// Only signed-in people get a token (a real Supabase account or a GitHub session); anonymous visitors don't.
// And only members of the repo: GitHub must let the caller see it (PLAN/2026-10-16-repo-members-only.md).
export async function POST(req: Request) {
  const keys = liveKitKeys();
  if (!keys) return NextResponse.json({ error: "Calls aren't set up yet: the LiveKit keys are missing." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { repo?: unknown } | null;
  const room = roomForRepo(body?.repo);
  if (!room) return NextResponse.json({ error: "Send the repo as owner/name." }, { status: 400 });

  const who = await caller();
  if (!who) return NextResponse.json({ error: "Log in to join the call." }, { status: 401 });

  let access;
  try {
    access = await canSeeRepoAs(who.user, body?.repo as string);
  } catch {
    return NextResponse.json({ error: "Couldn't check this repo on GitHub. Try again in a moment." }, { status: 502 });
  }
  const closed = accessError(access);
  if (closed) return NextResponse.json(closed, { status: closed.status });

  return NextResponse.json({ token: createToken(keys, { identity: who.identity, name: who.name }, room), url: keys.url, room });
}

type Caller = { identity: string; name: string; user: Parameters<typeof canSeeRepoAs>[0] };

/** Who is asking, or null if nobody is signed in. Supabase account first, then the GitHub session. */
async function caller(): Promise<Caller | null> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (u && !u.is_anonymous) {
      const m = u.user_metadata ?? {};
      return { identity: `sb:${u.id}`, name: m.full_name || m.name || m.user_name || u.email?.split("@")[0] || "Teammate", user: u };
    }
  }
  try {
    const s = await getSession();
    if (s.user && !s.fake) return { identity: `gh:${s.user.login}`, name: s.user.name || s.user.login, user: null };
  } catch {
    // GitHub unreachable: treat as signed out.
  }
  // Local dev with no accounts set up at all: let a guest in so the screen can be tried.
  if (!supabase && fakeMode) return { identity: `guest:${crypto.randomUUID().slice(0, 8)}`, name: "Guest", user: null };
  return null;
}
