// Plain-language versions of the errors people can hit (GitHub and network problems), for screens to show instead of
// raw messages like "Not Found". Pure, no imports. Anything else (our own messages) is shown as it is.

export function friendlyError(e: unknown, fallback = "Something went wrong. Try again."): string {
  const status = typeof e === "object" && e !== null && typeof (e as { status?: unknown }).status === "number" ? (e as { status: number }).status : 0;
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const m = raw.toLowerCase();
  if (/failed to fetch|load failed|networkerror|network request failed/.test(m)) return "Can't reach CoCommit. Check your connection and try again.";
  if (status === 401) return "Log in with GitHub to do this.";
  if (/rate limit/.test(m)) return "GitHub is limiting requests right now. Wait a minute and try again.";
  if (status === 403) return "GitHub says you don't have permission to do that here.";
  if (status === 404 || m === "not found") return "GitHub couldn't find that. It may have been renamed or removed, or you may not have access.";
  if (status === 409) return "That changed while you were working. Reload and try again.";
  if (status === 422 && /already exists/.test(m)) return "That name is already taken. Pick another one.";
  if (status >= 500) return "GitHub had a problem. Try again in a moment.";
  return raw.trim() || fallback;
}
