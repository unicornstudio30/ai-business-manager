"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type Datum = { month: string; revenue: number };

export function RevenueChart({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-semibold text-stone-900">Revenue (last 12 months)</div>
        <div className="text-xs text-stone-500">Total ${total.toLocaleString()}</div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#57534e" fontSize={11} />
            <YAxis tickLine={false} axisLine={false} stroke="#a8a29e" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12 }}
              cursor={{ fill: "#f5f5f4" }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
            />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.revenue > 0 ? "#10b981" : "#e7e5e4"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
