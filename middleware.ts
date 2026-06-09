// Route-level auth guard. Runs on the Edge runtime for every request.
//
// Auth model:
// - Unauthenticated page request → redirect to /login?from=<path>
// - Unauthenticated API request → 401 JSON
// - Always allowed: /login, /api/auth/*, /api/mcp/* (MCP uses its own model),
//   static assets, favicon.
// - Slash-command bypass: requests carrying x-claude-api-key === CLAUDE_API_KEY
//   skip the session check.
// - Disabled entirely if AUTH_EMAIL / AUTH_PASSWORD / AUTH_SECRET aren't set
//   (local-dev convenience — set them in .env.local + Vercel to turn on).

import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/",
  "/api/mcp",          // MCP server uses its own auth model
  "/_next/",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function authConfigured(): boolean {
  return !!process.env.AUTH_EMAIL && !!process.env.AUTH_PASSWORD && !!process.env.AUTH_SECRET;
}

export async function middleware(req: NextRequest) {
  // Auth not configured → don't enforce (dev mode + safety against locking
  // yourself out of prod if env vars are missing).
  if (!authConfigured()) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  // Always allow public paths
  if (isPublic(pathname)) return NextResponse.next();

  // Slash-command bypass via x-claude-api-key header
  const claudeKey = process.env.CLAUDE_API_KEY;
  if (claudeKey && req.headers.get("x-claude-api-key") === claudeKey) {
    return NextResponse.next();
  }

  // Verify session cookie
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) return NextResponse.next();

  // Unauthenticated: API → 401 JSON, pages → redirect to /login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname + (search || ""));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match everything except files that should always be public:
  //   _next/static, _next/image, favicon, anything with a file extension.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
