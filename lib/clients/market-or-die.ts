// Thin client for the standalone Market or Die app.
//
// Enabled when MARKET_OR_DIE_URL is set in .env.local. When it's unset the
// legacy in-tree behaviour (local DB) is used — this keeps things working
// during the split-over.

import type { Platform, ActivityKind } from "@/lib/marketing/points";

export function marketOrDieUrl(): string | null {
  const url = process.env.MARKET_OR_DIE_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

export function marketOrDieEnabled(): boolean {
  return !!marketOrDieUrl();
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) throw new Error("CLAUDE_API_KEY not set — cannot call Market or Die");
  return {
    "x-claude-api-key": key,
    "content-type": "application/json",
    ...(extra || {}),
  };
}

async function safeFetch(input: string, init?: RequestInit): Promise<Response> {
  // No-cache — the leaderboard should reflect current state, not a CDN copy.
  return fetch(input, { ...init, cache: "no-store" });
}

// ────────────────────────────────────────────────────────────────────
// TYPES — mirror the MoD external API responses, kept local to avoid
// coupling the parent to the child's type exports.
// ────────────────────────────────────────────────────────────────────

export type MoDLeaderRow = {
  rank: number;
  userId: string;
  name: string;
  email: string;
  role: string;
  level: 1 | 2 | 3 | 4;
  weekPoints: number;
  targetPoints: number;
  pct: number;
  hitTarget: boolean;
  streakWeeks: number;
  activityCount: number;
  lifetimePoints: number;
};

export type MoDLeaderboard = {
  weekStart: string;
  weekLabel: string;
  teamTotals: {
    activeUsers: number;
    totalWeekPoints: number;
    hitTargetCount: number;
    topStreak: number;
  };
  rows: MoDLeaderRow[];
};

export type MoDUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  notionPerson: string | null;
};

// ────────────────────────────────────────────────────────────────────
// READS
// ────────────────────────────────────────────────────────────────────

export async function fetchLeaderboard(weekStart?: string): Promise<MoDLeaderboard> {
  const base = marketOrDieUrl();
  if (!base) throw new Error("MARKET_OR_DIE_URL not set");
  const qs = weekStart ? `?week=${encodeURIComponent(weekStart)}` : "";
  const res = await safeFetch(`${base}/api/external/leaderboard${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`MoD leaderboard fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchUsers(): Promise<MoDUser[]> {
  const base = marketOrDieUrl();
  if (!base) throw new Error("MARKET_OR_DIE_URL not set");
  const res = await safeFetch(`${base}/api/external/users`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`MoD users fetch failed: ${res.status}`);
  const data = await res.json();
  return data.users || [];
}

// ────────────────────────────────────────────────────────────────────
// WRITES
// ────────────────────────────────────────────────────────────────────

export type PostActivityInput = {
  userId: string;
  platform: Platform;
  kind: ActivityKind;
  count?: number;
  notes?: string | null;
  weekStart?: string;
  source?: string | null;   // idempotency key — safe to re-post
};

export type PostActivityResult = {
  ok: boolean;
  inserted: boolean;         // false if the source key already existed
  error?: string;
};

export async function postActivity(input: PostActivityInput): Promise<PostActivityResult> {
  const base = marketOrDieUrl();
  if (!base) throw new Error("MARKET_OR_DIE_URL not set");
  const res = await safeFetch(`${base}/api/external/activities`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, inserted: false, error: data?.error || `HTTP ${res.status}` };
  }
  return { ok: true, inserted: !!data.inserted };
}
