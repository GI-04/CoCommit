import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Google login wall: refreshes the Supabase session on every request and sends signed-out users to /login.
// Off for the demo (Pattadon: GitHub sign-in only); set REQUIRE_GOOGLE_LOGIN=true to turn it back on.
// With no Supabase keys, everything passes through too.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || process.env.REQUIRE_GOOGLE_LOGIN !== "true") return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  // Chat signs people in anonymously; that doesn't count as a Google login.
  const user = data.user && !data.user.is_anonymous ? data.user : null;
  const path = request.nextUrl.pathname;
  // "/" is the public landing page; /login/forgot is for people who can't log in; /legal must be readable before signing up.
  const isPublic = path === "/" || path === "/login" || path === "/login/forgot" || path === "/legal" || path.startsWith("/auth/");

  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (user && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/home";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  // robots.txt, sitemap.xml, the icons and the share image must stay public even with the login wall on.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icon/|apple-icon|opengraph-image|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
