/** A GitHub username typed by a person ("octocat" or "@octocat"), or null if it can't be one. */
export function cleanUsername(value: unknown): string | null {
  const name = String(value ?? "").trim().replace(/^@/, "");
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(name) ? name : null;
}
