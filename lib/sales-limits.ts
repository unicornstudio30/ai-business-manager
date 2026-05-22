// Safe daily outreach limits per platform — protects accounts from
// bans/restrictions. These are PLATFORM MAX values. Daily targets are set at
// 70–80% of these to leave safety buffer (computed via TARGET_PCT).
//
// Source: industry best practices for cold outreach in 2026. Adjust as
// platforms tighten their detection. New/recently-restricted accounts should
// use WARMUP_PCT instead (~25% of normal).

export const PLATFORM_LIMITS = {
  linkedin: {
    label: "LinkedIn",
    color: "blue",
    actions: {
      connect:    { max: 40,  label: "Connection requests" },
      dm:         { max: 100, label: "DMs to connections" },
      follow_up:  { max: 30,  label: "Follow-ups" },
    },
  },
  x: {
    label: "X (Twitter)",
    color: "stone",
    actions: {
      dm:        { max: 250, label: "DMs" },
      connect:   { max: 400, label: "Follows" },     // X = follows instead of connect
      follow_up: { max: 30,  label: "Follow-ups" },
    },
  },
  instagram: {
    label: "Instagram",
    color: "pink",
    actions: {
      dm:        { max: 150, label: "DMs" },
      connect:   { max: 200, label: "Follows" },
      follow_up: { max: 30,  label: "Follow-ups" },
    },
  },
  facebook: {
    label: "Facebook",
    color: "indigo",
    actions: {
      connect:   { max: 40,  label: "Friend requests" },
      dm:        { max: 30,  label: "Cold DMs" },
      follow_up: { max: 20,  label: "Follow-ups" },
    },
  },
  reddit: {
    label: "Reddit",
    color: "rose",
    actions: {
      dm:        { max: 30,  label: "DMs" },
      follow_up: { max: 10,  label: "Follow-ups" },
    },
  },
  discord: {
    label: "Discord",
    color: "violet",
    actions: {
      dm:        { max: 20,  label: "DMs (sensitive to spam)" },
      follow_up: { max: 10,  label: "Follow-ups" },
    },
  },
  whatsapp: {
    label: "WhatsApp",
    color: "green",
    actions: {
      dm:        { max: 30,  label: "DMs (personal, ban-sensitive)" },
      follow_up: { max: 20,  label: "Follow-ups to existing chats" },
    },
  },
  slack: {
    label: "Slack",
    color: "violet",
    actions: {
      dm:        { max: 30,  label: "DMs in workspaces" },
      follow_up: { max: 15,  label: "Follow-ups" },
    },
  },
  email: {
    label: "Cold Email",
    color: "amber",
    actions: {
      dm:        { max: 40,  label: "Cold emails sent" },
      follow_up: { max: 40,  label: "Follow-up emails" },
    },
  },
} as const;

export type PlatformKey = keyof typeof PLATFORM_LIMITS;
export type ActionKey = "dm" | "connect" | "comment" | "follow_up" | "inmail";

// Daily targets at 75% of platform max (leave 25% safety buffer).
export const TARGET_PCT = 0.75;
// Warmup mode (new accounts < 30 days, or after restriction): 25% of max.
export const WARMUP_PCT = 0.25;

export const PLATFORMS_ORDER: PlatformKey[] = ["linkedin", "x", "instagram", "facebook", "reddit", "discord", "whatsapp", "slack", "email"];

export function target(platform: PlatformKey, action: ActionKey, isWarmup = false): number {
  const max = (PLATFORM_LIMITS[platform].actions as any)[action]?.max;
  if (!max) return 0;
  return Math.floor(max * (isWarmup ? WARMUP_PCT : TARGET_PCT));
}

export function maxFor(platform: PlatformKey, action: ActionKey): number {
  return (PLATFORM_LIMITS[platform].actions as any)[action]?.max ?? 0;
}

// Status of a single counter against its target/max.
// safe (green) = below target. warn (amber) = between target and 90% of max. danger (red) = ≥90% of max.
export type CapStatus = "safe" | "warn" | "danger";
export function capStatus(count: number, platform: PlatformKey, action: ActionKey, isWarmup = false): CapStatus {
  const t = target(platform, action, isWarmup);
  const m = maxFor(platform, action);
  if (count >= m * 0.9) return "danger";
  if (count >= t) return "warn";
  return "safe";
}
