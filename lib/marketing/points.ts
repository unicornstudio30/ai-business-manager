// "Market or Die" point system.
//
// Each marketing activity earns a number of points. The values below are
// tuned so a healthy week of "small actions" (a few posts + comments) lands a
// salesperson around their L1 target (200 pts), while one big channel
// build-out (a long blog + YouTube video) overshoots even an L2 target — i.e.
// volume rewards consistency, leverage rewards depth.
//
// Tune freely as your team's marketing mix changes.

export type Platform =
  | "linkedin"
  | "x"
  | "youtube"
  | "tiktok"
  | "reddit"
  | "instagram"
  | "facebook"
  | "blog"
  | "podcast"
  | "newsletter"
  | "other";

export type ActivityKind =
  | "post"             // text/image post
  | "video"            // long-form video (YouTube, TikTok long)
  | "short"            // short-form video / reel
  | "story"            // 24h story
  | "carousel"         // multi-slide post
  | "blog_post"        // published blog article
  | "newsletter_send"  // newsletter blast
  | "podcast_episode"
  | "comment"          // commented on someone else's content
  | "reply"            // replied to a comment / thread
  | "dm"               // outbound DM (marketing-style, not sales)
  | "channel_setup"    // one-time platform setup
  | "lead_magnet"      // shipped a downloadable
  | "live_session"     // ran a live / webinar
  | "other";

// Base per-unit point value. Multiplied by `count` when logging.
// e.g. logging 3 LinkedIn comments → 3 × 2 = 6 pts.
const BASE_POINTS: Record<ActivityKind, number> = {
  post:            10,
  video:           50,
  short:           20,
  story:            5,
  carousel:        15,
  blog_post:      100,
  newsletter_send: 60,
  podcast_episode: 80,
  comment:          2,
  reply:            2,
  dm:               3,
  channel_setup:  200,   // one-time
  lead_magnet:    150,
  live_session:   120,
  other:           10,
};

// Per-platform multiplier — rewards harder platforms a bit more.
const PLATFORM_MULTIPLIER: Record<Platform, number> = {
  linkedin:   1.0,
  x:          0.8,    // easier to spam, slightly lower per post
  youtube:    1.4,    // more effort per piece
  tiktok:     1.2,
  reddit:     1.1,    // niche-specific, real engagement
  instagram:  1.0,
  facebook:   1.0,
  blog:       1.0,
  podcast:    1.3,
  newsletter: 1.2,
  other:      1.0,
};

export function pointsFor(
  platform: Platform,
  kind: ActivityKind,
  count = 1
): number {
  const base = BASE_POINTS[kind] ?? BASE_POINTS.other;
  const mult = PLATFORM_MULTIPLIER[platform] ?? 1.0;
  return Math.max(1, Math.round(base * mult * count));
}

// Level thresholds — based on lifetime marketing points.
// Drives the L1/L2/L3/L4 badge + the default weekly target.
export type Level = 1 | 2 | 3 | 4;

export function levelFromLifetimePoints(lifetime: number): Level {
  if (lifetime >= 20_000) return 4;
  if (lifetime >=  5_000) return 3;
  if (lifetime >=  1_000) return 2;
  return 1;
}

// Default weekly target per level. Admin can override per user per week via
// /api/marketing/target or the leaderboard "set target" affordance.
export const DEFAULT_TARGET_BY_LEVEL: Record<Level, number> = {
  1: 200,
  2: 600,
  3: 1500,
  4: 4000,
};

export function defaultTargetFor(lifetime: number): number {
  return DEFAULT_TARGET_BY_LEVEL[levelFromLifetimePoints(lifetime)];
}

// All activity kinds in display order — used to render the log-activity form.
export const ALL_KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: "post",            label: "Post" },
  { kind: "video",           label: "Video (long-form)" },
  { kind: "short",           label: "Short / Reel" },
  { kind: "story",           label: "Story" },
  { kind: "carousel",        label: "Carousel" },
  { kind: "blog_post",       label: "Blog post" },
  { kind: "newsletter_send", label: "Newsletter send" },
  { kind: "podcast_episode", label: "Podcast episode" },
  { kind: "comment",         label: "Comment" },
  { kind: "reply",           label: "Reply" },
  { kind: "dm",              label: "Outbound DM" },
  { kind: "channel_setup",   label: "Channel setup (one-time)" },
  { kind: "lead_magnet",     label: "Lead magnet" },
  { kind: "live_session",    label: "Live / webinar" },
  { kind: "other",           label: "Other" },
];

export const ALL_PLATFORMS: { platform: Platform; label: string }[] = [
  { platform: "linkedin",   label: "LinkedIn" },
  { platform: "x",          label: "X" },
  { platform: "youtube",    label: "YouTube" },
  { platform: "tiktok",     label: "TikTok" },
  { platform: "reddit",     label: "Reddit" },
  { platform: "instagram",  label: "Instagram" },
  { platform: "facebook",   label: "Facebook" },
  { platform: "blog",       label: "Blog" },
  { platform: "podcast",    label: "Podcast" },
  { platform: "newsletter", label: "Newsletter" },
  { platform: "other",      label: "Other" },
];

// Helpers for week-bucketing. Weeks start on Monday (UTC) so timezone shifts
// don't drift the boundary mid-week.
export function weekStartFor(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();                 // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day;     // shift back to Monday
  x.setUTCDate(x.getUTCDate() + diff);
  return x.toISOString().slice(0, 10);       // YYYY-MM-DD
}

export function addWeeks(weekStart: string, n: number): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

export function fmtWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  return `Week of ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}
