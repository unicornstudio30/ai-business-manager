"use client";

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import type { TrendPoint } from "@/lib/db/leaderboard-engine";
import { TrendingUp, Calendar } from "lucide-react";

type Tone = "amber" | "emerald" | "blue";

const TONE_META: Record<Tone, { stroke: string; fill: string; label: string; iconClass: string }> = {
  amber:   { stroke: "#d97706", fill: "#fef3c7", label: "amber",   iconClass: "text-amber-600" },
  emerald: { stroke: "#059669", fill: "#d1fae5", label: "emerald", iconClass: "text-emerald-600" },
  blue:    { stroke: "#2563eb", fill: "#dbeafe", label: "blue",    iconClass: "text-blue-600" },
};

export function LeaderboardTrend({
  data,
  tone,
  title,
}: {
  data: TrendPoint[];
  tone: Tone;
  title: string;
}) {
  const meta = TONE_META[tone];
  const totalPoints = data.reduce((s, d) => s + d.points, 0);
  const totalActivities = data.reduce((s, d) => s + d.activities, 0);
  const daysActive = data.filter((d) => d.activities > 0).length;
  const peakDay = data.reduce((best, d) => (d.points > best.points ? d : best), { points: 0, label: "—", date: "—", activities: 0 } as TrendPoint);

  const avgPerActiveDay = daysActive > 0 ? Math.round(totalPoints / daysActive) : 0;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div className="inline-flex items-center gap-2">
          <TrendingUp className={`size-4 ${meta.iconClass}`} />
          <span className="text-sm font-semibold text-stone-900">{title}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span><strong className="text-stone-900 tabular-nums">{totalPoints.toLocaleString()}</strong> pts</span>
          <span><strong className="text-stone-900 tabular-nums">{totalActivities}</strong> {totalActivities === 1 ? "activity" : "activities"}</span>
          <span><strong className="text-stone-900 tabular-nums">{daysActive}</strong>/{data.length} active days</span>
          {peakDay.points > 0 && (
            <span className="hidden sm:inline">
              Peak: <strong className="text-stone-900">{peakDay.points}</strong> pts on {peakDay.label}
            </span>
          )}
        </div>
      </div>
      {totalPoints === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-xs text-stone-400 gap-1 border border-dashed border-stone-200 rounded-xl">
          <Calendar className="size-4" />
          Nothing logged in the last {data.length} days.
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={`grad-${meta.label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={meta.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                stroke="#a8a29e"
                fontSize={10}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="#a8a29e"
                fontSize={11}
                allowDecimals={false}
                width={36}
              />
              <Tooltip
                contentStyle={{ border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: 12, padding: "6px 10px" }}
                labelFormatter={(label) => `${label}`}
                formatter={(value: any, _n: any, p: any) => {
                  return [`${value} pts · ${p?.payload?.activities ?? 0} activities`, ""];
                }}
              />
              {avgPerActiveDay > 0 && (
                <ReferenceLine y={avgPerActiveDay} stroke="#78716c" strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Area
                type="monotone"
                dataKey="points"
                stroke={meta.stroke}
                strokeWidth={2}
                fill={`url(#grad-${meta.label})`}
                dot={{ fill: meta.stroke, r: 2.5 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
