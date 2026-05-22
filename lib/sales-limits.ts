// Safe daily + hourly outreach limits per platform — protects accounts from
// bans/restrictions. Each action has:
//   - max:     absolute platform ceiling (hard cap from industry research)
//   - perHour: recommended hourly pacing budget (spread actions across the day
//              instead of burst-sending — burst patterns trigger bot detection)
// Daily target = max * TARGET_PCT (75%). Per-hour target = perHour.
//
// LinkedIn note: "dm" = messaging existing 1st-degree connections (high cap).
// "inmail" = paid InMail to non-connections (low cap, expensive). They are
// separate limits — sending too many InMails in a day will get the account
// flagged regardless of how many DMs you sent to connections.
//
// Source: industry best practices for cold outreach in 2026. Adjust as
// platforms tighten their detection. New/recently-restricted accounts should
// use WARMUP_PCT instead (~25% of normal).

export const PLATFORM_LIMITS = {
  linkedin: {
    label: "LinkedIn",
    color: "blue",
    actions: {
      connect:    { max: 40,  perHour: 5,  label: "Connection requests" },
      dm:         { max: 100, perHour: 12, label: "DMs to connections" },
      inmail:     { max: 20,  perHour: 3,  label: "InMail (unconnected)" },
      follow_up:  { max: 30,  perHour: 4,  label: "Follow-ups" },
    },
  },
  x: {
    label: "X (Twitter)",
    color: "stone",
    actions: {
      dm:        { max: 250, perHour: 30, label: "DMs" },
      connect:   { max: 400, perHour: 50, label: "Follows" },
      follow_up: { max: 30,  perHour: 4,  label: "Follow-ups" },
    },
  },
  instagram: {
    label: "Instagram",
    color: "pink",
    actions: {
      dm:        { max: 150, perHour: 18, label: "DMs" },
      connect:   { max: 200, perHour: 25, label: "Follows" },
      follow_up: { max: 30,  perHour: 4,  label: "Follow-ups" },
    },
  },
  facebook: {
    label: "Facebook",
    color: "indigo",
    actions: {
      connect:   { max: 40,  perHour: 5,  label: "Friend requests" },
      dm:        { max: 30,  perHour: 4,  label: "Cold DMs" },
      follow_up: { max: 20,  perHour: 3,  label: "Follow-ups" },
    },
  },
  reddit: {
    label: "Reddit",
    color: "rose",
    actions: {
      dm:        { max: 30,  perHour: 4,  label: "DMs" },
      follow_up: { max: 10,  perHour: 2,  label: "Follow-ups" },
    },
  },
  discord: {
    label: "Discord",
    color: "violet",
    actions: {
      dm:        { max: 20,  perHour: 3,  label: "DMs (sensitive to spam)" },
      follow_up: { max: 10,  perHour: 2,  label: "Follow-ups" },
    },
  },
  whatsapp: {
    label: "WhatsApp",
    color: "green",
    actions: {
      dm:        { max: 30,  perHour: 4,  label: "DMs (personal, ban-sensitive)" },
      follow_up: { max: 20,  perHour: 3,  label: "Follow-ups to existing chats" },
    },
  },
  slack: {
    label: "Slack",
    color: "violet",
    actions: {
      dm:        { max: 30,  perHour: 4,  label: "DMs in workspaces" },
      follow_up: { max: 15,  perHour: 2,  label: "Follow-ups" },
    },
  },
  email: {
    label: "Cold Email",
    color: "amber",
    actions: {
      dm:        { max: 40,  perHour: 6,  label: "Cold emails sent" },
      follow_up: { max: 40,  perHour: 6,  label: "Follow-up emails" },
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

// Active outreach window (local time). Hourly pacing budgets assume you work
// within this range. Adjust here when your schedule changes (or when an
// automation tool extends it).
export const ACTIVE_WINDOW_START_HOUR = 10;     // 10 AM
export const ACTIVE_WINDOW_END_HOUR   = 23;     // 11 PM (exclusive)
export const ACTIVE_HOURS = ACTIVE_WINDOW_END_HOUR - ACTIVE_WINDOW_START_HOUR;

export function target(platform: PlatformKey, action: ActionKey, isWarmup = false): number {
  const max = (PLATFORM_LIMITS[platform].actions as any)[action]?.max;
  if (!max) return 0;
  return Math.floor(max * (isWarmup ? WARMUP_PCT : TARGET_PCT));
}

export function maxFor(platform: PlatformKey, action: ActionKey): number {
  return (PLATFORM_LIMITS[platform].actions as any)[action]?.max ?? 0;
}

// Hourly pacing budget — soft target, not a hard cap. Warmup halves it.
export function perHour(platform: PlatformKey, action: ActionKey, isWarmup = false): number {
  const ph = (PLATFORM_LIMITS[platform].actions as any)[action]?.perHour ?? 0;
  return isWarmup ? Math.max(1, Math.floor(ph * 0.5)) : ph;
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

// Hourly pacing status — compares actions-so-far-today against the pace we
// "should" have at this hour-of-day, based on the active window above.
// Behind = safe, on-pace = ok, over-pace = burst risk.
export type PaceStatus = "behind" | "on_pace" | "over_pace";

export function activeHoursElapsed(now: Date = new Date()): number {
  const hour = now.getHours();
  return Math.max(0, Math.min(ACTIVE_HOURS, hour - ACTIVE_WINDOW_START_HOUR + 1));
}

export function paceStatus(
  count: number,
  platform: PlatformKey,
  action: ActionKey,
  now: Date = new Date(),
  isWarmup = false
): PaceStatus {
  const ph = perHour(platform, action, isWarmup);
  if (ph === 0) return "on_pace";
  const expected = ph * activeHoursElapsed(now);
  if (count < expected * 0.6) return "behind";
  if (count > expected * 1.4) return "over_pace";
  return "on_pace";
}
