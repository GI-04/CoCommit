// Checks the live chat rules from outside (supabase/chat-privacy.sql): signs in to Supabase anonymously with the
// public anon key, the way anyone on the internet could, and tries to read messages and profiles. Both must show 0.
// Usage: node scripts/check-chat-privacy.mjs   (reads .env.local; prints counts only, never keys or data)
// Note: each run creates one throwaway anonymous user while anonymous sign-ins are on (it signs out at the end).
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first.");
  process.exit(1);
}

const signup = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: "{}" });
const session = await signup.json();
if (!session.access_token) {
  // Anonymous sign-ins turned off: nobody can get an anonymous session at all, which is the safest state.
  console.log(`Anonymous sign-in refused (HTTP ${signup.status}): nobody can read chat anonymously.`);
  process.exit(0);
}

const headers = { apikey: key, Authorization: `Bearer ${session.access_token}`, Prefer: "count=exact" };
let leaks = 0;
for (const table of ["messages", "profiles"]) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers });
  const total = Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
  console.log(`${table}: an anonymous session can see ${total} row(s)`);
  leaks += total;
}
await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}` } });
console.log(leaks ? "LEAK: anonymous sessions can read data. Run supabase/chat-privacy.sql." : "OK: anonymous sessions see nothing.");
process.exit(leaks ? 1 : 0);
