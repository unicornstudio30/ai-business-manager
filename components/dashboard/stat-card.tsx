export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "red" | "green" | "amber";
}) {
  const palette = {
    default: { dot: "bg-stone-400", value: "text-stone-900" },
    red: { dot: "bg-red-500", value: "text-red-700" },
    green: { dot: "bg-emerald-500", value: "text-emerald-700" },
    amber: { dot: "bg-amber-500", value: "text-amber-700" },
  }[tone];
  return (
    <div className="stat-card group">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
        <span className={`size-1.5 rounded-full ${palette.dot}`} />
        {label}
      </div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight tabular-nums ${palette.value}`}>
        {value}
      </div>
    </div>
  );
}
