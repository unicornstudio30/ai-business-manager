// Funnel & conversion analytics, computed from PBM's stage history
// (stage_events, recorded on every Notion pull) and the current mirror.
//
// Groups and their order come from lib/stage-config.ts. Archive (lost /
// not qualified) is an exit, not a step, so it is left out of the ladder.

import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "./client";
import { IN_NOTION } from "./active-contacts";
import { FUNNEL_GROUPS, type StageGroup } from "../stage-config";
import { stageGroup, isWon, hasRole } from "../stages";

const DAY = 86_400_000;
const LADDER: StageGroup[] = FUNNEL_GROUPS; // Cold → … → Won
const rank = (g: StageGroup | null) => (g ? LADDER.indexOf(g) : -1);

type Opts = { seat?: string | null };

async function activeContacts(opts: Opts) {
  return db
    .select({
      id: schema.contacts.id,
      status: schema.contacts.status,
      ownerName: schema.contacts.ownerName,
      statusDate: schema.contacts.statusDate,
      lastTouchAt: schema.contacts.lastTouchAt,
    })
    .from(schema.contacts)
    .where(opts.seat ? and(IN_NOTION, eq(schema.contacts.ownerName, opts.seat)) : IN_NOTION);
}

async function eventsFor(contactIds: string[]) {
  if (contactIds.length === 0) return [];
  const out: (typeof schema.stageEvents.$inferSelect)[] = [];
  for (let i = 0; i < contactIds.length; i += 200) {
    out.push(
      ...(await db
        .select()
        .from(schema.stageEvents)
        .where(inArray(schema.stageEvents.contactId, contactIds.slice(i, i + 200)))
        .orderBy(asc(schema.stageEvents.at)))
    );
  }
  return out;
}

export type ConversionStep = {
  group: StageGroup;
  reached: number;            // contacts that ever reached this group or further
  current: number;            // contacts in this group now
  conversionFromPrev: number | null; // reached / reached(previous group)
};

export type FunnelConversion = {
  seat: string | null;
  contacts: number;
  steps: ConversionStep[];
  won: number;
  lost: number;
  winRate: number | null;     // won / (won + lost)
  replyRate: number | null;   // reached Engaged / reached Cold
};

// "Reached" uses the furthest group in a contact's history (falls back to its
// current stage), so a contact that went Proposal → Lost still counts as
// having reached Proposal.
export async function funnelConversion(opts: Opts = {}): Promise<FunnelConversion> {
  const contacts = await activeContacts(opts);
  const events = await eventsFor(contacts.map((c) => c.id));
  const furthest = new Map<string, number>();
  for (const e of events) {
    const r = rank(stageGroup(e.toStage));
    if (r > (furthest.get(e.contactId) ?? -1)) furthest.set(e.contactId, r);
  }
  for (const c of contacts) {
    const r = rank(stageGroup(c.status));
    if (r > (furthest.get(c.id) ?? -1)) furthest.set(c.id, r);
  }

  const steps: ConversionStep[] = LADDER.map((group, i) => {
    const reached = contacts.filter((c) => (furthest.get(c.id) ?? -1) >= i).length;
    const current = contacts.filter((c) => stageGroup(c.status) === group).length;
    return { group, reached, current, conversionFromPrev: null };
  });
  steps.forEach((s, i) => {
    if (i > 0) s.conversionFromPrev = steps[i - 1].reached > 0 ? s.reached / steps[i - 1].reached : null;
  });

  const won = contacts.filter((c) => isWon(c.status)).length;
  const lost = contacts.filter((c) => hasRole(c.status, "loss") || hasRole(c.status, "disqualified")).length;
  const cold = steps[0]?.reached ?? 0;
  const engaged = steps[1]?.reached ?? 0;
  return {
    seat: opts.seat ?? null,
    contacts: contacts.length,
    steps,
    won,
    lost,
    winRate: won + lost > 0 ? won / (won + lost) : null,
    replyRate: cold > 0 ? engaged / cold : null,
  };
}

export type StageTiming = {
  stage: string;
  group: StageGroup | null;
  completedStays: number;      // stays that ended (contact moved on)
  medianDaysCompleted: number | null;
  openNow: number;             // contacts currently in this stage
  medianDaysOpen: number | null;
};

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// How long contacts stay in each stage: finished stays (from history) and
// the age of current stays.
export async function timeInStage(opts: Opts = {}): Promise<StageTiming[]> {
  const contacts = await activeContacts(opts);
  const events = await eventsFor(contacts.map((c) => c.id));
  const byContact = new Map<string, typeof events>();
  for (const e of events) {
    const arr = byContact.get(e.contactId) ?? [];
    arr.push(e);
    byContact.set(e.contactId, arr);
  }
  const done = new Map<string, number[]>();
  const open = new Map<string, number[]>();
  const now = Date.now();
  for (const c of contacts) {
    const evs = byContact.get(c.id) ?? [];
    for (let i = 0; i + 1 < evs.length; i++) {
      const st = evs[i].toStage;
      if (!st) continue;
      const days = (evs[i + 1].at.getTime() - evs[i].at.getTime()) / DAY;
      if (days >= 0) done.set(st, [...(done.get(st) ?? []), days]);
    }
    if (c.status) {
      const enteredAt = evs.length ? evs[evs.length - 1].at : c.statusDate ?? null;
      if (enteredAt) open.set(c.status, [...(open.get(c.status) ?? []), (now - enteredAt.getTime()) / DAY]);
    }
  }
  const stages = new Set([...done.keys(), ...open.keys()]);
  return [...stages]
    .map((stage) => ({
      stage,
      group: stageGroup(stage),
      completedStays: done.get(stage)?.length ?? 0,
      medianDaysCompleted: median(done.get(stage) ?? []),
      openNow: open.get(stage)?.length ?? 0,
      medianDaysOpen: median(open.get(stage) ?? []),
    }))
    .sort((a, b) => rank(a.group) - rank(b.group) || a.stage.localeCompare(b.stage));
}

export type WeeklyMoves = {
  weekStart: string;
  entered: number;   // new contacts first seen with a stage
  forward: number;
  backward: number;
  won: number;
  lost: number;
};

// Stage moves seen per week (Monday-start, UTC), excluding seeded starting points.
export async function weeklyStageMoves(opts: Opts & { weeks?: number } = {}): Promise<WeeklyMoves[]> {
  const weeks = opts.weeks ?? 12;
  const monday = (d: Date) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
  };
  const start = monday(new Date(Date.now() - (weeks - 1) * 7 * DAY));
  const rows = await db
    .select()
    .from(schema.stageEvents)
    .where(
      and(
        eq(schema.stageEvents.source, "pull"),
        gte(schema.stageEvents.at, start),
        opts.seat ? eq(schema.stageEvents.seat, opts.seat) : undefined
      )
    );
  const buckets = new Map<string, WeeklyMoves>();
  for (let i = 0; i < weeks; i++) {
    const w = new Date(start.getTime() + i * 7 * DAY).toISOString().slice(0, 10);
    buckets.set(w, { weekStart: w, entered: 0, forward: 0, backward: 0, won: 0, lost: 0 });
  }
  for (const e of rows) {
    const w = monday(e.at).toISOString().slice(0, 10);
    const b = buckets.get(w);
    if (!b) continue;
    if (!e.fromStage) b.entered++;
    else if (isWon(e.toStage)) b.won++;
    else if (hasRole(e.toStage, "loss") || hasRole(e.toStage, "disqualified")) b.lost++;
    else if (rank(stageGroup(e.toStage)) >= rank(stageGroup(e.fromStage))) b.forward++;
    else b.backward++;
  }
  return [...buckets.values()];
}

// Raw history for one contact or the latest moves overall.
export async function stageHistory(opts: { contactId?: string; seat?: string | null; limit?: number } = {}) {
  const rows = await db
    .select({
      id: schema.stageEvents.id,
      contactId: schema.stageEvents.contactId,
      contactName: schema.contacts.name,
      fromStage: schema.stageEvents.fromStage,
      toStage: schema.stageEvents.toStage,
      seat: schema.stageEvents.seat,
      at: schema.stageEvents.at,
      source: schema.stageEvents.source,
    })
    .from(schema.stageEvents)
    .leftJoin(schema.contacts, eq(schema.contacts.id, schema.stageEvents.contactId))
    .where(
      and(
        opts.contactId ? eq(schema.stageEvents.contactId, opts.contactId) : undefined,
        opts.seat ? eq(schema.stageEvents.seat, opts.seat) : undefined
      )
    );
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, opts.limit ?? 100);
}
