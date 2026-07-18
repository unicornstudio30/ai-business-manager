"use client";

// Small per-user sparkline shown on the drill-down page. Renders one
// bar per period bucket (day / week / month) — height = points.

import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type Tone = "amber" | "emerald" | "blue";

const TONE_FILL: Record<Tone, string> = {
  amber:   "#d97706",
  emerald: "#059669",
  blue:    "#2563eb",
};

export function UserSparkline({
  data,
  tone,
}: {
  data: { key: string; label: string; points: number; activities: number }[];
  tone: Tone;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.points), 1);
  const fill = TONE_FILL[tone];
  return (
    <div className="h-24 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="#a8a29e"
            fontSize={9}
            interval="preserveStartEnd"
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12, padding: "6px 10px" }}
            labelFormatter={(label) => `${label}`}
            formatter={(value: any, _n: any, p: any) => [
              `${value} pts · ${p?.payload?.activities ?? 0} ${p?.payload?.activities === 1 ? "activity" : "activities"}`,
              "",
            ]}
          />
          <Bar dataKey="points" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={fill} fillOpacity={d.points === 0 ? 0.15 : (d.points / max) * 0.6 + 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
