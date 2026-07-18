"use client";

// Stacked-bar chart of events per day, colored by event type. Sits at the
// top of /history to give a visual pulse of the last N days at a glance.

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";

type TypeKey = "activity" | "deal_closed" | "tracker" | "kpi_logged" | "content_created" | "content_published" | "sync";

const TYPE_LABEL: Record<TypeKey, string> = {
  activity: "Activities",
  deal_closed: "Deals closed",
  tracker: "Tracker",
  kpi_logged: "Daily KPIs",
  content_created: "Content ideas",
  content_published: "Published",
  sync: "Sync",
};

const TYPE_COLOR: Record<TypeKey, string> = {
  activity: "#7c3aed",         // violet
  deal_closed: "#e11d48",      // rose
  tracker: "#78716c",          // stone
  kpi_logged: "#4f46e5",       // indigo
  content_created: "#a8a29e",  // stone-400
  content_published: "#059669",// emerald
  sync: "#d6d3d1",             // stone-300
};

const ORDER: TypeKey[] = [
  "activity",
  "content_published",
  "deal_closed",
  "kpi_logged",
  "content_created",
  "tracker",
  "sync",
];

export type DayBucket = {
  date: string;               // YYYY-MM-DD
  label: string;              // short axis label
} & Partial<Record<TypeKey, number>>;

export function EventsPerDayChart({
  data,
  days,
}: {
  data: DayBucket[];
  days: number;
}) {
  const total = data.reduce((s, d) => {
    let n = 0;
    for (const k of ORDER) n += Number(d[k] ?? 0);
    return s + n;
  }, 0);
  const activeDays = data.filter((d) => {
    let n = 0;
    for (const k of ORDER) n += Number(d[k] ?? 0);
    return n > 0;
  }).length;

  const presentTypes = ORDER.filter((t) => data.some((d) => Number(d[t] ?? 0) > 0));

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-sm font-semibold text-stone-900 mb-2">Activity — last {days} days</div>
        <div className="h-32 flex items-center justify-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
          No events in the selected window.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm font-semibold text-stone-900">Activity — last {days} days</div>
        <div className="text-xs text-stone-500">
          <strong className="text-stone-900 tabular-nums">{total}</strong> events ·{" "}
          <strong className="text-stone-900 tabular-nums">{activeDays}</strong>/{data.length} active days
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              stroke="#a8a29e"
              fontSize={10}
              interval="preserveStartEnd"
            />
            <YAxis tickLine={false} axisLine={false} stroke="#a8a29e" fontSize={11} allowDecimals={false} width={30} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12, padding: "6px 10px" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconSize={10}
              formatter={(value) => TYPE_LABEL[value as TypeKey] ?? value}
            />
            {presentTypes.map((t) => (
              <Bar
                key={t}
                dataKey={t}
                stackId="events"
                fill={TYPE_COLOR[t]}
                radius={t === presentTypes[presentTypes.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                name={t}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
