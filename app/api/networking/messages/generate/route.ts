// POST /api/networking/messages/generate
// Body: { contactId, purpose?, contextChips?, contextDetail?, ctaChips?, tone?,
//         framework?, channel?, language?, topic? }
//
// Generates 3 message variants, persists them with all wizard inputs to
// networking_messages, and returns the saved row.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getNetworkingContact } from "@/lib/db/networking-contacts";
import { getLastMessageForContact, createMessage } from "@/lib/db/networking-messages";
import {
  generateMessageVariants,
  computeStrengthScore,
  type WriteMessageInputs,
} from "@/lib/ai/write-message";
import { isOpenRouterConfigured } from "@/lib/openrouter";

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

  const contactId = String(body?.contactId || "").trim();
  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }
  const contact = await getNetworkingContact(contactId);
  if (!contact) {
    return NextResponse.json({ error: "contact not found" }, { status: 404 });
  }

  const lastMessage = await getLastMessageForContact(contactId);
  let lastBody: string | null = null;
  if (lastMessage) {
    const chosen = lastMessage.chosenVariant ?? "standard";
    lastBody =
      (chosen === "short" && lastMessage.generatedShort) ||
      (chosen === "detailed" && lastMessage.generatedDetailed) ||
      lastMessage.generatedStandard ||
      null;
  }

  // Sanitize array inputs
  const arr = (v: any): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 3) : [];

  const inputs: WriteMessageInputs = {
    recipient: contact,
    relationship: contact.relationship,
    purpose: body.purpose || null,
    contextChips: arr(body.contextChips),
    contextDetail: body.contextDetail || null,
    ctaChips: arr(body.ctaChips),
    tone: body.tone || null,
    framework: body.framework || null,
    channel: body.channel || null,
    language: body.language || "English",
    topic: body.topic || null,
    lastMessage: lastBody,
    senderName: "Saidur Rahaman",
    senderOrg: "Unicorn Studio",
  };

  let variants;
  try {
    variants = await generateMessageVariants(inputs);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Generation failed" },
      { status: 502 }
    );
  }

  const strengthScore = computeStrengthScore(inputs);

  const saved = await createMessage({
    contactId,
    purpose: inputs.purpose,
    contextChips: inputs.contextChips && inputs.contextChips.length > 0 ? JSON.stringify(inputs.contextChips) : null,
    contextDetail: inputs.contextDetail,
    ctaChips: inputs.ctaChips && inputs.ctaChips.length > 0 ? JSON.stringify(inputs.ctaChips) : null,
    tone: inputs.tone,
    framework: inputs.framework,
    channel: inputs.channel,
    language: inputs.language,
    topic: inputs.topic,
    generatedShort: variants.short,
    generatedStandard: variants.standard,
    generatedDetailed: variants.detailed,
    strengthScore,
    status: "draft",
  });

  revalidatePath(`/networking/${contactId}`);
  return NextResponse.json({ ok: true, message: saved });
}
