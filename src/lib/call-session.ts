// Pure helpers for the call that stays on while you use the app (PLAN/2026-10-16-call-stays-on.md).
// No React or LiveKit imports, so tests can load this file on its own. CallProvider.tsx uses them.

export type CallSession = { repo: string; url: string; token: string };

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

/** Asks our server for a LiveKit token for the repo's room (same request /calls made before). */
export async function requestCall(repo: string, fetchFn: FetchLike): Promise<CallSession> {
  const res = await fetchFn("/api/livekit-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo }),
  });
  const data = ((await res.json().catch(() => ({}))) ?? {}) as { token?: string; url?: string; error?: string };
  if (!res.ok || !data.token || !data.url) throw new Error(data.error ?? "Couldn't join the call.");
  return { repo, url: data.url, token: data.token };
}

/** The small call bar shows on every page except /calls, which has the full view. */
export function showCallBar(pathname: string | null | undefined, inCall: boolean): boolean {
  return inCall && pathname !== "/calls" && !(pathname ?? "").startsWith("/calls/");
}

/** Whether the browser can float a video in a picture-in-picture window. */
export function pipSupported(doc: { pictureInPictureEnabled?: boolean } | undefined): boolean {
  return Boolean(doc?.pictureInPictureEnabled);
}
