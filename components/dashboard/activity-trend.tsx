"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

type Datum = { date: string; fullDate: string; count: number };

export function ActivityTrend({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-semibold text-stone-900">Activity — last 30 days</div>
        <div className="text-xs text-stone-500">{total} total</div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              stroke="#a8a29e"
              fontSize={10}
              interval={4}
            />
            <YAxis tickLine={false} axisLine={false} stroke="#a8a29e" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12 }}
              labelFormatter={(label) => `${label}`}
              formatter={(value) => [`${value} activities`, ""]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ fill: "#0f172a", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
