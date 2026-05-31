// Analytics derived from the Notion PRM mirror + local networking_messages.
// All inputs are read-only — the user maintains the underlying data in Notion
// and the app surfaces the rollups.

import { and, count, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "./client";

const DAY_MS = 86_400_000;
const NOW = () => new Date();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

export type NetworkingAnalytics = {
  // Headline KPIs
  total: number;
  newLast30Days: number;
  overdueFollowUps: number;
  followUpsDueThisWeek: number;
  noLastContact: number;
  goingCold: number;          // last contact 30-90 days ago
  veryCold: number;           // last contact > 90 days ago (or never)
  totalMessagesDrafted: number;
  messagesLast30Days: number;

  // Distributions
  byStage: { stage: string; count: number }[];
  byRelationship: { relationship: string; count: number }[];
  byPlatform: { platform: string; count: number }[];
  byFreshness: {
    label: string;
    count: number;
    bucket: "fresh" | "warm" | "cooling" | "cold" | "never";
  }[];

  // Activity
  messageActivity14Day: { date: string; count: number }[];   // last 14 days, oldest → newest
  byFramework: { framework: string; count: number }[];
  byTone: { tone: string; count: number }[];

  // Top lists
  oldestUntouched: {
    id: string;
    name: string;
    relationship: string | null;
    stage: string | null;
    daysSinceContact: number | null;
  }[];
  upcomingFollowUps: {
    id: string;
    name: string;
    relationship: string | null;
    nextFollowUpAt: Date;
    daysUntil: number;
  }[];
};

export async function getNetworkingAnalytics(): Promise<NetworkingAnalytics> {
  const now = NOW();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(today);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(today);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
  const d30 = daysAgo(30);
  const d90 = daysAgo(90);

  // Single pull — we filter + bucket in JS. PRM size is small (~hundreds).
  const contacts = await db.select().from(schema.networkingContacts);
  const messages = await db.select().from(schema.networkingMessages);

  // Headline counts
  const total = contacts.length;
  const newLast30Days = contacts.filter((c) => c.createdAt && c.createdAt >= d30).length;
  const overdueFollowUps = contacts.filter(
    (c) => c.nextFollowUpAt && c.nextFollowUpAt < startOfTomorrow
  ).length;
  const followUpsDueThisWeek = contacts.filter(
    (c) => c.nextFollowUpAt && c.nextFollowUpAt >= startOfTomorrow && c.nextFollowUpAt < startOfNextWeek
  ).length;
  const noLastContact = contacts.filter((c) => !c.lastContactAt).length;
  const goingCold = contacts.filter(
    (c) => c.lastContactAt && c.lastContactAt < d30 && c.lastContactAt >= d90
  ).length;
  const veryCold = contacts.filter(
    (c) => c.lastContactAt && c.lastContactAt < d90
  ).length;

  // Distributions
  const tally = <T extends string | null | undefined>(get: (c: typeof contacts[number]) => T) => {
    const m = new Map<string, number>();
    for (const c of contacts) {
      const v = get(c);
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const byStage = tally((c) => c.stage).map((x) => ({ stage: x.key, count: x.count }));
  const byRelationship = tally((c) => c.relationship).map((x) => ({ relationship: x.key, count: x.count }));
  const byPlatform = tally((c) => c.platform).map((x) => ({ platform: x.key, count: x.count }));

  // Freshness buckets (days since last contact)
  const fresh = contacts.filter((c) => c.lastContactAt && c.lastContactAt >= daysAgo(7)).length;
  const warm = contacts.filter((c) => c.lastContactAt && c.lastContactAt < daysAgo(7) && c.lastContactAt >= d30).length;
  const cooling = goingCold;
  const cold = veryCold;
  const never = noLastContact;
  const byFreshness: NetworkingAnalytics["byFreshness"] = [
    { label: "Fresh (0-7d)", count: fresh, bucket: "fresh" },
    { label: "Warm (8-30d)", count: warm, bucket: "warm" },
    { label: "Cooling (31-90d)", count: cooling, bucket: "cooling" },
    { label: "Cold (90d+)", count: cold, bucket: "cold" },
    { label: "Never contacted", count: never, bucket: "never" },
  ];

  // Message activity (last 14 days)
  const days14: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    d.setHours(0, 0, 0, 0);
    days14.push(d.toISOString().slice(0, 10));
  }
  const msgByDay = new Map<string, number>();
  for (const m of messages) {
    if (!m.createdAt) continue;
    const day = new Date(m.createdAt);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString().slice(0, 10);
    msgByDay.set(key, (msgByDay.get(key) ?? 0) + 1);
  }
  const messageActivity14Day = days14.map((d) => ({ date: d, count: msgByDay.get(d) ?? 0 }));

  const totalMessagesDrafted = messages.length;
  const messagesLast30Days = messages.filter((m) => m.createdAt && m.createdAt >= d30).length;

  // Framework + tone breakdown (from drafts — most-used)
  const fwTally = new Map<string, number>();
  const toneTally = new Map<string, number>();
  for (const m of messages) {
    if (m.framework) fwTally.set(m.framework, (fwTally.get(m.framework) ?? 0) + 1);
    if (m.tone) toneTally.set(m.tone, (toneTally.get(m.tone) ?? 0) + 1);
  }
  const byFramework = Array.from(fwTally.entries())
    .map(([framework, count]) => ({ framework, count }))
    .sort((a, b) => b.count - a.count);
  const byTone = Array.from(toneTally.entries())
    .map(([tone, count]) => ({ tone, count }))
    .sort((a, b) => b.count - a.count);

  // Oldest untouched — contacts you haven't talked to in the longest time
  const withContact = contacts
    .filter((c) => c.lastContactAt)
    .sort((a, b) => (a.lastContactAt!.getTime() - b.lastContactAt!.getTime()))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      stage: c.stage,
      daysSinceContact: c.lastContactAt
        ? Math.floor((now.getTime() - c.lastContactAt.getTime()) / DAY_MS)
        : null,
    }));
  // If we don't have 5 yet, top up with "never contacted"
  const oldestUntouched = withContact;
  if (oldestUntouched.length < 5) {
    const never = contacts
      .filter((c) => !c.lastContactAt)
      .slice(0, 5 - oldestUntouched.length)
      .map((c) => ({
        id: c.id,
        name: c.name,
        relationship: c.relationship,
        stage: c.stage,
        daysSinceContact: null,
      }));
    oldestUntouched.push(...never);
  }

  // Upcoming follow-ups (next 14 days, sorted)
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);
  const upcomingFollowUps = contacts
    .filter(
      (c) =>
        c.nextFollowUpAt &&
        c.nextFollowUpAt >= startOfTomorrow &&
        c.nextFollowUpAt <= horizon
    )
    .sort((a, b) => a.nextFollowUpAt!.getTime() - b.nextFollowUpAt!.getTime())
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      nextFollowUpAt: c.nextFollowUpAt!,
      daysUntil: Math.ceil((c.nextFollowUpAt!.getTime() - today.getTime()) / DAY_MS),
    }));

  return {
    total,
    newLast30Days,
    overdueFollowUps,
    followUpsDueThisWeek,
    noLastContact,
    goingCold,
    veryCold,
    totalMessagesDrafted,
    messagesLast30Days,
    byStage,
    byRelationship,
    byPlatform,
    byFreshness,
    messageActivity14Day,
    byFramework,
    byTone,
    oldestUntouched,
    upcomingFollowUps,
  };
}
