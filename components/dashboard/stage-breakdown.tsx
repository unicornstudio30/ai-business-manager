type Groups = Record<string, { count: number; stages: { name: string; count: number }[] }>;

const groupColors: Record<string, string> = {
  Cold: "bg-stone-400",
  Engaged: "bg-blue-500",
  Qualified: "bg-cyan-500",
  Proposal: "bg-emerald-500",
  Call: "bg-amber-500",
  Won: "bg-violet-500",
  Archive: "bg-zinc-300",
};

export function StageBreakdown({ groups }: { groups: Groups }) {
  const entries = Object.entries(groups);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="text-sm font-semibold text-stone-900 mb-4">By stage</div>
      <ul className="flex flex-col gap-2">
        {entries.map(([group, data]) => (
          <li key={group} className="flex items-center gap-3 text-sm">
            <span className={`inline-block size-2.5 rounded-full ${groupColors[group] ?? "bg-stone-400"}`} />
            <span className="flex-1 text-stone-700">{group}</span>
            <span className="font-medium text-stone-900 tabular-nums">{data.count}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-4 border-t border-stone-100 text-xs text-stone-500 leading-relaxed">
        Cold → Engaged → Qualified → Proposal → Call → Won.
        18 Notion stages collapsed into 7 dashboard groups.
      </div>
    </div>
  );
}
