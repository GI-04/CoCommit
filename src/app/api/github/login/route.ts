import { NextResponse, type NextRequest } from "next/server";
import { signInUrl } from "@/lib/github";

// GET /api/github/login?returnTo=/repo → GitHub's sign-in page (in fake mode, straight back to returnTo).
export async function GET(req: NextRequest) {
  return NextResponse.redirect(await signInUrl(req.nextUrl.origin, req.nextUrl.searchParams.get("returnTo")));
}
