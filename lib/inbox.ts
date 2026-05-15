// Inbox channel taxonomy + helpers.
// Channels are normalized lowercase strings. They map to (a) the contact's
// platform field from Notion CRM, and (b) any per-message channel override.

export const INBOX_CHANNELS = [
  "linkedin",
  "x",
  "facebook",
  "whatsapp",
  "slack",
  "reddit",
  "email",
  "comment",
  "other",
] as const;

export type InboxChannel = (typeof INBOX_CHANNELS)[number];

// Map Notion CRM Platform values → our channel slug.
const PLATFORM_MAP: Record<string, InboxChannel> = {
  Linkedin: "linkedin",
  LinkedIn: "linkedin",
  linkedin: "linkedin",
  X: "x",
  Twitter: "x",
  twitter: "x",
  Facebook: "facebook",
  facebook: "facebook",
  Whatsapp: "whatsapp",
  WhatsApp: "whatsapp",
  Slack: "slack",
  slack: "slack",
  Reddit: "reddit",
  reddit: "reddit",
  Email: "email",
  email: "email",
};

export function platformToChannel(platform: string | null | undefined): InboxChannel | null {
  if (!platform) return null;
  return PLATFORM_MAP[platform] ?? null;
}

export const CHANNEL_LABELS: Record<InboxChannel, string> = {
  linkedin: "LinkedIn",
  x: "X / Twitter",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  slack: "Slack",
  reddit: "Reddit",
  email: "Email",
  comment: "Comment",
  other: "Other",
};

export const CHANNEL_COLORS: Record<InboxChannel, string> = {
  linkedin: "bg-blue-100 text-blue-800 border-blue-200",
  x: "bg-sky-100 text-sky-800 border-sky-200",
  facebook: "bg-indigo-100 text-indigo-800 border-indigo-200",
  whatsapp: "bg-green-100 text-green-800 border-green-200",
  slack: "bg-violet-100 text-violet-800 border-violet-200",
  reddit: "bg-orange-100 text-orange-800 border-orange-200",
  email: "bg-stone-100 text-stone-800 border-stone-200",
  comment: "bg-pink-100 text-pink-800 border-pink-200",
  other: "bg-zinc-100 text-zinc-800 border-zinc-200",
};
