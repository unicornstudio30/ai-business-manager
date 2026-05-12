"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type Datum = { group: string; count: number };

const COLORS: Record<string, string> = {
  Cold: "#a8a29e",
  Engaged: "#60a5fa",
  Qualified: "#06b6d4",
  Proposal: "#10b981",
  Call: "#f59e0b",
  Won: "#8b5cf6",
};

export function FunnelChart({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-semibold text-stone-900">Pipeline funnel</div>
        <div className="text-xs text-stone-500">{total} contacts in pipeline</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
            <XAxis type="number" tickLine={false} axisLine={false} stroke="#a8a29e" fontSize={11} />
            <YAxis dataKey="group" type="category" tickLine={false} axisLine={false} stroke="#57534e" fontSize={12} width={80} />
            <Tooltip
              contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12 }}
              cursor={{ fill: "#f5f5f4" }}
              formatter={(value) => [`${value} contacts`, ""]}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((d) => (
                <Cell key={d.group} fill={COLORS[d.group] ?? "#a8a29e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
