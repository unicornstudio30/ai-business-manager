import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Auth enforcement is opt-in via AUTH_SECRET. Without it, the app runs
// in unauthenticated dev mode — easier local iteration. In production
// on Vercel, AUTH_SECRET must be set or every request bounces to /login.
const AUTH_ENABLED = !!process.env.AUTH_SECRET;

// Protect all routes except auth, login, public assets, and API webhooks
// (the slash-command API endpoints require a CLAUDE_API_KEY header instead).
export default auth((req) => {
  if (!AUTH_ENABLED) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Public paths
  const publicPaths = [
    "/login",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Claude Code API access via header-based key (no session required)
  if (pathname.startsWith("/api/")) {
    const apiKey = req.headers.get("x-claude-api-key");
    if (apiKey && process.env.CLAUDE_API_KEY && apiKey === process.env.CLAUDE_API_KEY) {
      return NextResponse.next();
    }
    // No API key — fall through to session check below
  }

  // Check session
  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
