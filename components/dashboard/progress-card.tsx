import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Progress card for dashboard row 2 — shows count vs daily target with a slim
// progress bar. Used by Connect / Engage / DM tiles.

type Tone = "emerald" | "violet" | "blue" | "stone";

export function ProgressCard({
  label,
  count,
  target,
  href,
  unit = "today",
  tone = "stone",
}: {
  label: string;
  count: number;
  target: number;
  href?: string;
  unit?: string;
  tone?: Tone;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
  const hit = target > 0 && count >= target;
  const accentText = {
    emerald: "text-emerald-700",
    violet: "text-violet-700",
    blue: "text-blue-700",
    stone: "text-stone-900",
  }[tone];
  const barColor = hit
    ? "bg-emerald-500"
    : pct >= 60
      ? {
          emerald: "bg-emerald-400",
          violet: "bg-violet-400",
          blue: "bg-blue-400",
          stone: "bg-amber-400",
        }[tone]
      : {
          emerald: "bg-emerald-300",
          violet: "bg-violet-300",
          blue: "bg-blue-300",
          stone: "bg-stone-300",
        }[tone];

  const inner = (
    <div className="stat-card group">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
        {href && (
          <ArrowUpRight className="size-3.5 text-stone-300 group-hover:text-stone-700 transition-colors" />
        )}
      </div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight tabular-nums ${accentText}`}>
        {count}
        <span className="text-2xl text-stone-400 font-normal"> / {target}</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div className={`${barColor} h-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-[11px] text-stone-500 tabular-nums">
        {hit ? `✓ daily target hit · ${unit}` : `${pct}% · ${unit}`}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
