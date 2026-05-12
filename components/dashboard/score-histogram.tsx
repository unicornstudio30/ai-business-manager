"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type Datum = { range: string; count: number };

const COLORS = ["#d6d3d1", "#fbbf24", "#f97316", "#ef4444", "#dc2626"];

export function ScoreHistogram({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-semibold text-stone-900">Lead score distribution</div>
        <div className="text-xs text-stone-500">{total} scored</div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="range" tickLine={false} axisLine={false} stroke="#57534e" fontSize={11} />
            <YAxis tickLine={false} axisLine={false} stroke="#a8a29e" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12 }}
              cursor={{ fill: "#f5f5f4" }}
              formatter={(value) => [`${value} contacts`, ""]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={d.range} fill={COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Hotter scores (right) = better engagement signal. Sort the engagement queue by score to act on these first.
      </p>
    </div>
  );
}
