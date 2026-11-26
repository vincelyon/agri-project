import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/", "/login"]);

// Optimistic gate only: pages and services still verify the session against the
// database and enforce role permissions on the server.
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Static assets from /public never need a session.
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const userId = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  // Signed-in users who open the marketing pages go straight into the app.
  if (userId && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (userId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
