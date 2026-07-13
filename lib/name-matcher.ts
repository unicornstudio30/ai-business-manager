// Fuzzy name matching for Notion Person ↔ app user resolution.
//
// The Notion CRM's Person column may use a slightly different spelling than
// the app user record ("Saydur Rahman" vs "Saidur Rahaman" vs just "Saidur").
// Treat Notion as source of truth: match tolerantly, then let admins pin the
// exact Notion spelling as an override (users.notion_person) so future syncs
// are deterministic.

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(/\s+/).filter(Boolean);
}

// Standard Levenshtein — good enough for names of typical length.
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// Two tokens are "similar" if:
//   - one is a prefix of the other ("Alex" / "Alexander"), OR
//   - edit distance ≤ max(1, floor(shorter/4)) — e.g. "Saidur"/"Saydur" (d=1)
function tokensSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
  }
  const shorter = Math.min(a.length, b.length);
  const threshold = Math.max(1, Math.floor(shorter / 4));
  return editDistance(a, b) <= threshold;
}

// True when two names likely refer to the same person.
//
// Rules:
//   - First-token (given name) must be similar per tokensSimilar()
//   - If both names have a second token, at least one non-first token pair
//     must also be similar (avoids "John Smith" ≈ "Jane Smith" false positives)
//   - If one name has only one token ("Saidur"), the first-token check alone
//     is enough — treat it as a nickname / short form
export function fuzzyNameMatch(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  if (!tokensSimilar(ta[0], tb[0])) return false;

  const restA = ta.slice(1);
  const restB = tb.slice(1);
  if (restA.length > 0 && restB.length > 0) {
    const anyMatch = restA.some((x) => restB.some((y) => tokensSimilar(x, y)));
    if (!anyMatch) return false;
  }

  return true;
}

// Resolve an owner name to at most one user via three tiers:
//   1. Exact match on notion_person override (case-insensitive)
//   2. Exact match on user's display name (case-insensitive)
//   3. Fuzzy match on display name — only accepted when EXACTLY ONE user
//      fuzzy-matches (ambiguous fuzzy is treated as no match to force manual
//      pinning via /admin/users)

export type NameMatchable = {
  id: string;
  name: string;
  notionPerson: string | null;
};

export type NameMatchTier = "notion_person" | "name" | "fuzzy" | null;

export type NameMatchResult<T extends NameMatchable> = {
  user: T;
  via: Exclude<NameMatchTier, null>;
} | null;

export function resolveOwnerName<T extends NameMatchable>(
  ownerName: string | null | undefined,
  users: T[]
): NameMatchResult<T> {
  if (!ownerName) return null;
  const needle = ownerName.trim().toLowerCase();
  if (!needle) return null;

  const byOverride = users.find(
    (u) => (u.notionPerson || "").trim().toLowerCase() === needle
  );
  if (byOverride) return { user: byOverride, via: "notion_person" };

  const byName = users.find((u) => (u.name || "").trim().toLowerCase() === needle);
  if (byName) return { user: byName, via: "name" };

  const fuzzy = users.filter((u) => fuzzyNameMatch(ownerName, u.name || ""));
  if (fuzzy.length === 1) return { user: fuzzy[0], via: "fuzzy" };

  return null;
}
