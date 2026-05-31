// POST /api/networking/profile-parse
// Body: { mode: "image" | "text" | "url", payload: string }
//   - image: data URL "data:image/...;base64,..." (or any https image URL)
//   - text:  raw text copied from a profile page
//   - url:   public URL to fetch + parse (LI/X/IG/FB blocked by design)
//
// Returns: { ok: true, parsed: ParsedProfile } | { error }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  parseProfileFromImage,
  parseProfileFromText,
  parseProfileFromUrl,
  type ParsedProfile,
} from "@/lib/ai/profile-parse";
import { isOpenRouterConfigured } from "@/lib/openrouter";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB — generous for screenshots

export async function POST(req: NextRequest) {
  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not set in .env.local" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const mode = String(body?.mode || "").trim();
  const payload = typeof body?.payload === "string" ? body.payload : "";
  if (!payload) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 });
  }

  let parsed: ParsedProfile;
  try {
    if (mode === "image") {
      if (!payload.startsWith("data:image/") && !/^https?:\/\//.test(payload)) {
        return NextResponse.json(
          { error: "image must be a data URL or https URL" },
          { status: 400 }
        );
      }
      // Rough size check for data URLs (base64 inflates by ~33%)
      if (payload.startsWith("data:") && payload.length > MAX_IMAGE_BYTES * 1.4) {
        return NextResponse.json(
          { error: `image too large (max ~${MAX_IMAGE_BYTES / 1024 / 1024} MB)` },
          { status: 413 }
        );
      }
      parsed = await parseProfileFromImage(payload);
    } else if (mode === "text") {
      parsed = await parseProfileFromText(payload);
    } else if (mode === "url") {
      parsed = await parseProfileFromUrl(payload);
    } else {
      return NextResponse.json(
        { error: "mode must be 'image' | 'text' | 'url'" },
        { status: 400 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Parse failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, parsed });
}
