import { NextResponse } from "next/server";
import { signOut } from "@/lib/github";

// POST /api/github/logout forgets the GitHub token (the app login stays).
export async function POST() {
  await signOut();
  return NextResponse.json({ ok: true });
}
