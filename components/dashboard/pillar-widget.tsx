// Unified dashboard pillar card — single source for Connect / Engage / DM tiles.
// Shows: header + "see all" link, count vs target with progress bar, optional
// summary chips, and a "next steps" list of contacts to action.

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Tone = "emerald" | "violet" | "blue";

const ACCENT: Record<Tone, { text: string; barOk: string; barWarn: string; barCold: string }> = {
  emerald: { text: "text-emerald-700", barOk: "bg-emerald-500", barWarn: "bg-emerald-400", barCold: "bg-emerald-300" },
  violet:  { text: "text-violet-700",  barOk: "bg-emerald-500", barWarn: "bg-violet-400",  barCold: "bg-violet-300" },
  blue:    { text: "text-blue-700",    barOk: "bg-emerald-500", barWarn: "bg-blue-400",    barCold: "bg-blue-300" },
};

export type PillarRow = {
  id: string;
  name: string;
  // One-liner under the name: e.g. "LinkedIn · ICP 71" or "Prospect · 25d overdue"
  meta?: string | null;
  // Optional right-side chip (channel pill, status, etc.)
  chip?: { label: string; tone: string } | null;
  // Small icons on the right (Top 50 star, Hot flame, etc.)
  badges?: React.ReactNode;
  href: string;
};

export function PillarWidget({
  title,
  icon,
  seeAllHref,
  count,
  target,
  tone,
  summaryChips,
  rows,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  seeAllHref: string;
  count: number;
  target: number;
  tone: Tone;
  summaryChips?: React.ReactNode;          // e.g. "2 Top 50 · 0 hot · 0 engagers"
  rows: PillarRow[];
  emptyMessage: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
  const a = ACCENT[tone];
  const barColor = pct >= 100 ? a.barOk : pct >= 60 ? a.barWarn : a.barCold;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          {icon} {title}
        </div>
        <Link href={seeAllHref} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>

      {/* Count / target with bar */}
      <div className={`text-3xl font-semibold tabular-nums ${a.text}`}>
        {count} <span className="text-base text-stone-400 font-normal">/ {target}</span>
      </div>
      <div className="mt-1 mb-3 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div className={`${barColor} h-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-stone-500 mb-3 tabular-nums">
        {pct >= 100 ? "✓ daily target hit · today" : `${pct}% · today`}
      </div>

      {/* Summary chips (Top 50 · hot · engagers, or channel chips) */}
      {summaryChips && <div className="mb-3">{summaryChips}</div>}

      {/* Next-steps rows */}
      {rows.length === 0 ? (
        <div className="text-sm text-stone-500 py-4 text-center">{emptyMessage}</div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {rows.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link href={r.href} className="text-sm font-medium text-stone-900 truncate block hover:underline">
                  {r.name}
                </Link>
                {r.meta && (
                  <div className="text-xs text-stone-500 truncate">{r.meta}</div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {r.badges}
                {r.chip && (
                  <span className={`text-[11px] rounded px-1.5 py-0.5 border ${r.chip.tone}`}>
                    {r.chip.label}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
