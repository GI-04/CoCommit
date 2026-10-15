// Checks that the person at the keyboard is Pattadon, for in-person approvals
// (PLAN/2026-10-15-in-person-approval.md). The secret (Pattadon's last name) is never in the repo:
// only a salted scrypt hash is stored below.
//   Check:  node scripts/check-override.mjs          (type the name when asked)
//   Set up: node scripts/check-override.mjs --hash   (Pattadon only; paste the output into OWNER_HASH)
import { scryptSync, timingSafeEqual } from "node:crypto";
import { createInterface } from "node:readline/promises";

const SALT = "cocommit-in-person-approval-v1";
const OWNER_HASH = ""; // set by Pattadon with --hash

// Ignore case, outer spaces and extra spaces, so "Smith" and " smith " match.
export function normalize(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function hash(text) {
  return scryptSync(normalize(text), SALT, 32).toString("hex");
}

// Read from the keyboard, not the command line, so the name never lands in shell history.
const rl = createInterface({ input: process.stdin, output: process.stdout });
const typed = await rl.question("Last name: ");
rl.close();

if (process.argv.includes("--hash")) {
  console.log(hash(typed));
} else if (!OWNER_HASH) {
  console.log("not set up yet");
} else {
  const ok = timingSafeEqual(Buffer.from(hash(typed), "hex"), Buffer.from(OWNER_HASH, "hex"));
  console.log(ok ? "match: Pattadon" : "no match");
}
