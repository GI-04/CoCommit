import { llmsTxt } from "@/lib/site";

// /llms.txt for AI search tools, built once at build time from the same facts as the landing page.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
