
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/lib/mcp/server";

// Stateless serverless mode — each request creates a fresh transport + server.
// Suits Vercel functions perfectly: no shared state between invocations.
async function handle(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,           // stateless
    enableJsonResponse: true,                 // return JSON directly, not SSE
  });
  const server = buildMcpServer();
  await server.connect(transport);

  // The transport reads the Request body itself.
  return transport.handleRequest(req as unknown as Request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
