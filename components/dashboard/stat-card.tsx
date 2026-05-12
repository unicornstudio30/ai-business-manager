export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "red" | "green" | "amber";
}) {
  const toneColor = {
    default: "text-stone-900",
    red: "text-red-900",
    green: "text-green-900",
    amber: "text-amber-900",
  }[tone];
  return (
    <div className="stat-card">
      <div className="text-sm text-stone-600">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${toneColor}`}>{value}</div>
    </div>
  );
}
