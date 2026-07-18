// Normalize a CRM contact's `platform` (LinkedIn / X / Facebook / …)
// into a Sell or Die Channel value. Used everywhere Sell or Die needs to
// derive the channel automatically from a Notion CRM contact rather than
// asking the user to pick one.

import type { Channel } from "./points";

export function normalizeChannelFromPlatform(p: string | null | undefined): Channel {
  const s = String(p || "").trim().toLowerCase();
  if (!s) return "linkedin";
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("email"))    return "email";
  if (s.includes("phone"))    return "phone";
  if (s.includes("zoom"))     return "zoom";
  if (s === "x" || s === "twitter" || s.includes("x.com")) return "x";
  if (s.includes("facebook") || s === "fb") return "facebook";
  if (s.includes("instagram") || s === "ig") return "instagram";
  if (s.includes("whatsapp")) return "whatsapp";
  return "other";
}
