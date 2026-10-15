import { NextResponse, type NextRequest } from "next/server";
import { finishSignIn } from "@/lib/github";

// GitHub sends the browser back here after sign-in, with a one-time ?code= and ?state=.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) {
    return new NextResponse(`GitHub sign-in was cancelled: ${q.get("error_description") ?? q.get("error")}`, { status: 400 });
  }
  try {
    const returnTo = await finishSignIn(req.nextUrl.origin, q.get("code"), q.get("state"));
    return NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
  } catch (e) {
    return new NextResponse(`GitHub sign-in failed: ${e instanceof Error ? e.message : String(e)}`, { status: 400 });
  }
}
