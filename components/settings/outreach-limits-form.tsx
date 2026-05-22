"use client";

// Editable form for outreach limits + active window.
// Loads current effective values (defaults merged with overrides) from
// /api/settings/outreach on mount, lets the user edit max + perHour for every
// (platform, action), then POSTs the whole config back.

import { useState, useTransition } from "react";
import { Save, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

type ActionEntry = { max: number; perHour: number; label: string; defaultMax: number; defaultPerHour: number };
type PlatformEntry = { label: string; actions: Record<string, ActionEntry> };

type Props = {
  defaults: Record<string, { label: string; actions: Record<string, { max: number; perHour: number; label: string }> }>;
  initial: {
    activeWindow: { startHour: number; endHour: number };
    overrides: Record<string, Record<string, { max?: number; perHour?: number }>>;
  };
};

function buildState(defaults: Props["defaults"], initial: Props["initial"]): {
  startHour: number;
  endHour: number;
  platforms: Record<string, PlatformEntry>;
} {
  const platforms: Record<string, PlatformEntry> = {};
  for (const [pk, pcfg] of Object.entries(defaults)) {
    const actions: Record<string, ActionEntry> = {};
    for (const [ak, acfg] of Object.entries(pcfg.actions)) {
      const override = initial.overrides?.[pk]?.[ak] ?? {};
      actions[ak] = {
        max: override.max ?? acfg.max,
        perHour: override.perHour ?? acfg.perHour,
        label: acfg.label,
        defaultMax: acfg.max,
        defaultPerHour: acfg.perHour,
      };
    }
    platforms[pk] = { label: pcfg.label, actions };
  }
  return {
    startHour: initial.activeWindow.startHour,
    endHour: initial.activeWindow.endHour,
    platforms,
  };
}

export function OutreachLimitsForm({ defaults, initial }: Props) {
  const [state, setState] = useState(() => buildState(defaults, initial));
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  function updateAction(pk: string, ak: string, field: "max" | "perHour", value: number) {
    setState((s) => ({
      ...s,
      platforms: {
        ...s.platforms,
        [pk]: {
          ...s.platforms[pk],
          actions: {
            ...s.platforms[pk].actions,
            [ak]: { ...s.platforms[pk].actions[ak], [field]: value },
          },
        },
      },
    }));
  }

  function resetAction(pk: string, ak: string) {
    setState((s) => {
      const a = s.platforms[pk].actions[ak];
      return {
        ...s,
        platforms: {
          ...s.platforms,
          [pk]: {
            ...s.platforms[pk],
            actions: {
              ...s.platforms[pk].actions,
              [ak]: { ...a, max: a.defaultMax, perHour: a.defaultPerHour },
            },
          },
        },
      };
    });
  }

  function resetAll() {
    setState((s) => {
      const platforms: Record<string, PlatformEntry> = {};
      for (const [pk, p] of Object.entries(s.platforms)) {
        const actions: Record<string, ActionEntry> = {};
        for (const [ak, a] of Object.entries(p.actions)) {
          actions[ak] = { ...a, max: a.defaultMax, perHour: a.defaultPerHour };
        }
        platforms[pk] = { ...p, actions };
      }
      return { startHour: 10, endHour: 23, platforms };
    });
  }

  function save() {
    setStatus(null);
    // Build overrides — only persist values that differ from defaults
    const overrides: Record<string, Record<string, { max?: number; perHour?: number }>> = {};
    for (const [pk, p] of Object.entries(state.platforms)) {
      for (const [ak, a] of Object.entries(p.actions)) {
        const diff: { max?: number; perHour?: number } = {};
        if (a.max !== a.defaultMax) diff.max = a.max;
        if (a.perHour !== a.defaultPerHour) diff.perHour = a.perHour;
        if (Object.keys(diff).length > 0) {
          if (!overrides[pk]) overrides[pk] = {};
          overrides[pk][ak] = diff;
        }
      }
    }
    const body = {
      activeWindow: { startHour: state.startHour, endHour: state.endHour },
      overrides,
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setStatus({ kind: "err", msg: `Save failed (HTTP ${res.status})` });
          return;
        }
        setStatus({ kind: "ok", msg: "Saved. Refresh other tabs to see the new targets." });
      } catch (e: any) {
        setStatus({ kind: "err", msg: e?.message ?? "Save failed" });
      }
    });
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-stone-900">Outreach limits &amp; pacing</div>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Daily max + hourly budget per platform per action. Daily target is auto-derived as 75% of max
            (25% safety buffer). The active window controls hourly-pace expectations across Connect, Engage, and DM.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
        >
          <RotateCcw className="size-3" /> Reset all to defaults
        </button>
      </div>

      {/* Active window */}
      <div className="mb-5 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
        <div className="text-xs font-semibold text-stone-700 mb-2">Active outreach window (local time)</div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-stone-600">Start hour:</span>
            <input
              type="number"
              min={0}
              max={23}
              value={state.startHour}
              onChange={(e) => setState((s) => ({ ...s, startHour: Number(e.target.value) }))}
              className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-stone-600">End hour:</span>
            <input
              type="number"
              min={1}
              max={24}
              value={state.endHour}
              onChange={(e) => setState((s) => ({ ...s, endHour: Number(e.target.value) }))}
              className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm tabular-nums"
            />
          </label>
          <span className="text-xs text-stone-500">
            ({Math.max(0, state.endHour - state.startHour)} active hours · 0 = midnight, 23 = 11 PM, 24 = next-day midnight)
          </span>
        </div>
      </div>

      {/* Per-platform tables */}
      <div className="flex flex-col gap-4">
        {Object.entries(state.platforms).map(([pk, p]) => (
          <details key={pk} className="rounded-lg border border-stone-200 open:bg-stone-50/40">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-50 flex items-center justify-between">
              <span>{p.label}</span>
              <span className="text-[10px] font-normal text-stone-500">
                {Object.keys(p.actions).length} action{Object.keys(p.actions).length === 1 ? "" : "s"}
              </span>
            </summary>
            <div className="px-4 pb-3">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="text-left py-1.5">Action</th>
                    <th className="text-right py-1.5 w-24">Daily max</th>
                    <th className="text-right py-1.5 w-24">Per hour</th>
                    <th className="text-right py-1.5 w-24">Target (75%)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Object.entries(p.actions).map(([ak, a]) => {
                    const changed = a.max !== a.defaultMax || a.perHour !== a.defaultPerHour;
                    return (
                      <tr key={ak}>
                        <td className="py-1.5">
                          <div className="text-xs font-medium text-stone-800">{a.label}</div>
                          <div className="text-[10px] text-stone-400">
                            default: {a.defaultMax} / day · ~{a.defaultPerHour}/hr
                          </div>
                        </td>
                        <td className="py-1.5 text-right">
                          <input
                            type="number"
                            min={1}
                            value={a.max}
                            onChange={(e) => updateAction(pk, ak, "max", Number(e.target.value))}
                            className="w-20 rounded-md border border-stone-300 px-2 py-1 text-right text-sm tabular-nums"
                          />
                        </td>
                        <td className="py-1.5 text-right">
                          <input
                            type="number"
                            min={1}
                            value={a.perHour}
                            onChange={(e) => updateAction(pk, ak, "perHour", Number(e.target.value))}
                            className="w-20 rounded-md border border-stone-300 px-2 py-1 text-right text-sm tabular-nums"
                          />
                        </td>
                        <td className="py-1.5 text-right text-stone-500 tabular-nums">
                          {Math.floor(a.max * 0.75)}
                        </td>
                        <td className="py-1.5 text-right">
                          {changed && (
                            <button
                              type="button"
                              title="Reset to default"
                              onClick={() => resetAction(pk, ak)}
                              className="text-stone-400 hover:text-stone-900"
                            >
                              <RotateCcw className="size-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          <Save className="size-4" /> {pending ? "Saving…" : "Save changes"}
        </button>
        {status?.kind === "ok" && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="size-3.5" /> {status.msg}
          </span>
        )}
        {status?.kind === "err" && (
          <span className="inline-flex items-center gap-1 text-xs text-red-700">
            <AlertCircle className="size-3.5" /> {status.msg}
          </span>
        )}
      </div>
    </section>
  );
}
