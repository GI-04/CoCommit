import { NextResponse } from "next/server";
import { actions, GitHubError } from "@/lib/github";

// POST /api/github/<action> with the arguments as a JSON array, e.g. /api/github/listBranches ["owner/repo"].
// Browser code calls this through src/lib/github-client.ts.
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!Object.hasOwn(actions, action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 });
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Send JSON." }, { status: 415 });
  }
  const args: unknown = await req.json().catch(() => null);
  if (!Array.isArray(args)) {
    return NextResponse.json({ error: "Send the arguments as a JSON array." }, { status: 400 });
  }

  const fn = actions[action as keyof typeof actions] as (...a: unknown[]) => Promise<unknown>;
  try {
    return NextResponse.json((await fn(...args)) ?? null);
  } catch (e) {
    const status = e instanceof GitHubError ? e.status : 500;
    if (status === 500) console.error(`[github] ${action} failed`, e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status });
  }
}
