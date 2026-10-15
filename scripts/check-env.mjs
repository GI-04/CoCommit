// Checks .env.local without ever printing the values. Run: node scripts/check-env.mjs
import { existsSync, readFileSync } from "node:fs";

const file = new URL("../.env.local", import.meta.url);
const env = { ...process.env };
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} else {
  console.log("No .env.local yet: copy .env.example to .env.local first.\n");
}

const checks = [
  ["GITHUB_CLIENT_ID", "GitHub sign-in", (v) => /^(Ov23|Iv1\.)?[A-Za-z0-9.]{16,}$/.test(v)],
  ["GITHUB_CLIENT_SECRET", "GitHub sign-in", (v) => /^[a-f0-9]{40}$/i.test(v)],
  ["NEXT_PUBLIC_SUPABASE_URL", "Chat, Google sign-in", (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v)],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Chat, Google sign-in", (v) => v.startsWith("eyJ") || v.startsWith("sb_publishable_")],
  ["ANTHROPIC_API_KEY", "@cocommit chat bot", (v) => v.startsWith("sk-ant-"), "optional"],
  ["ANTHROPIC_WORKSPACE_ID", "@cocommit bot, keys without a workspace", (v) => v.startsWith("wrkspc_"), "optional"],
];

let missing = 0;
for (const [name, usedBy, looksRight, optional] of checks) {
  const v = env[name] ?? "";
  const status = !v ? (optional ? "missing (feature off)" : "MISSING (fake mode)") : looksRight(v) ? "set" : "set, but doesn't look right";
  if (!v && !optional) missing++;
  console.log(`${status.padEnd(28)} ${name}  (${usedBy})`);
}
console.log(missing ? `\n${missing} missing: those parts run on fake data.` : "\nAll set.");
