// Server-side runtime overrides for outreach limits + active window.
// Defaults live in lib/sales-limits.ts (PLATFORM_LIMITS + ACTIVE_WINDOW_*).
// Users can edit per-(platform, action) max + perHour and the active window
// in /settings; values are persisted in app_settings(key="outreach_config").
//
// Pages should call getEffectiveOutreachLimits() server-side once, then pass
// { limits, activeWindow } down to the Reminders / Caps components so all
// targets, hourly budgets, and pace chips reflect the saved overrides.

import { eq } from "drizzle-orm";
import { db, schema } from "./db/client";
import {
  PLATFORM_LIMITS,
  ACTIVE_WINDOW_START_HOUR,
  ACTIVE_WINDOW_END_HOUR,
  type ActionKey,
  type ActiveWindow,
  type EffectiveLimits,
  type EffectivePlatform,
  type PlatformKey,
} from "./sales-limits";

export type ActionOverride = { max?: number; perHour?: number };
export type PlatformOverride = Partial<Record<ActionKey, ActionOverride>>;
export type LimitsOverride = Partial<Record<PlatformKey, PlatformOverride>>;

export type OutreachConfig = {
  activeWindow: ActiveWindow;
  overrides: LimitsOverride;
};

const KEY = "outreach_config";

const DEFAULT_CONFIG: OutreachConfig = {
  activeWindow: { startHour: ACTIVE_WINDOW_START_HOUR, endHour: ACTIVE_WINDOW_END_HOUR },
  overrides: {},
};

export async function getOutreachConfig(): Promise<OutreachConfig> {
  try {
    const rows = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, KEY))
      .limit(1);
    const value = rows[0]?.value;
    if (!value) return DEFAULT_CONFIG;
    const parsed = JSON.parse(value);
    return {
      activeWindow: {
        startHour: Number(parsed.activeWindow?.startHour ?? DEFAULT_CONFIG.activeWindow.startHour),
        endHour: Number(parsed.activeWindow?.endHour ?? DEFAULT_CONFIG.activeWindow.endHour),
      },
      overrides: (parsed.overrides ?? {}) as LimitsOverride,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveOutreachConfig(config: OutreachConfig): Promise<void> {
  const value = JSON.stringify(config);
  const existing = await db
    .select({ key: schema.appSettings.key })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, KEY))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.appSettings.key, KEY));
  } else {
    await db.insert(schema.appSettings).values({ key: KEY, value, updatedAt: new Date() });
  }
}

// Merge static defaults with the override blob into the EffectiveLimits shape.
// Labels, color, and the set of available actions per platform come from
// PLATFORM_LIMITS — only max + perHour are overridable.
export function buildEffectiveLimits(overrides: LimitsOverride): EffectiveLimits {
  const out: EffectiveLimits = {};
  for (const [pk, pcfg] of Object.entries(PLATFORM_LIMITS) as [PlatformKey, typeof PLATFORM_LIMITS[PlatformKey]][]) {
    const platformOverride = overrides[pk] ?? {};
    const actions: EffectivePlatform["actions"] = {};
    for (const [ak, acfg] of Object.entries(pcfg.actions) as [ActionKey, any][]) {
      const ov = platformOverride[ak] ?? {};
      actions[ak] = {
        max: ov.max ?? acfg.max,
        perHour: ov.perHour ?? acfg.perHour,
        label: acfg.label,
      };
    }
    out[pk] = {
      label: pcfg.label,
      color: pcfg.color,
      actions,
    };
  }
  return out;
}

export type EffectiveOutreach = {
  limits: EffectiveLimits;
  activeWindow: ActiveWindow;
};

export async function getEffectiveOutreachLimits(): Promise<EffectiveOutreach> {
  const cfg = await getOutreachConfig();
  return { limits: buildEffectiveLimits(cfg.overrides), activeWindow: cfg.activeWindow };
}
