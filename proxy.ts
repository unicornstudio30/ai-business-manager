import { NextRequest, NextResponse } from "next/server";

// Auth model:
// - Browser pages + API routes: HTTP basic auth (one APP_USERNAME + APP_PASSWORD).
// - Slash commands: bypass basic auth via x-claude-api-key header.
// - Disabled entirely if APP_PASSWORD is empty (local dev convenience).

const USER = process.env.APP_USERNAME || "saidur";
const PASS = process.env.APP_PASSWORD;
const CLAUDE_KEY = process.env.CLAUDE_API_KEY;

export function proxy(req: NextRequest) {
  // No password → no auth (dev mode)
  if (!PASS) return NextResponse.next();

  // MCP endpoint — public for now (user chose "no auth" for testing).
  // TODO: wrap with bearer-token check before sharing the URL.
  if (req.nextUrl.pathname.startsWith("/api/mcp")) {
    return NextResponse.next();
  }

  // Slash command bypass
  if (CLAUDE_KEY && req.headers.get("x-claude-api-key") === CLAUDE_KEY) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const [user, ...passParts] = decoded.split(":");
      const pass = passParts.join(":");
      if (user === USER && pass === PASS) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Unicorn Studio Business Manager"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
