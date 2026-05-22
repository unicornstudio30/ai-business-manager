import { Flame, Calendar, Trophy } from "lucide-react";
import type { StreakInfo } from "@/lib/db/streak";

export function StreakHero({ streak }: { streak: StreakInfo }) {
  const sparkMax = Math.max(1, ...streak.weekDays.map((d) => d.total));
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-white p-5 shadow-elevation-1">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-full bg-amber-100 size-12 shadow-elevation-1">
            <Flame className="size-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Current streak</div>
            <div className="text-2xl font-semibold tabular-nums text-stone-900">
              {streak.current} {streak.current === 1 ? "day" : "days"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 border-l border-amber-200 pl-4">
          <Trophy className="size-3.5 text-stone-400" />
          <div>
            <div className="font-medium text-stone-700 tabular-nums">{streak.longest}d</div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500">Longest</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 border-l border-amber-200 pl-4">
          <Calendar className="size-3.5 text-stone-400" />
          <div>
            <div className="font-medium text-stone-700 tabular-nums">{streak.weekTotal}</div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500">This week</div>
          </div>
        </div>

        {/* Week sparkline */}
        <div className="ml-auto flex items-end gap-1 h-10">
          {streak.weekDays.map((d) => {
            const h = Math.max(2, Math.round((d.total / sparkMax) * 36));
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            const wd = new Date(d.date).toLocaleDateString(undefined, { weekday: "narrow" });
            return (
              <div key={d.date} className="flex flex-col items-center gap-0.5">
                <div className={`w-4 rounded-t-sm ${d.total === 0 ? "bg-stone-200" : isToday ? "bg-amber-500" : "bg-amber-300"}`} style={{ height: `${h}px` }} title={`${d.date}: ${d.total} actions`} />
                <span className={`text-[9px] ${isToday ? "text-amber-700 font-semibold" : "text-stone-400"}`}>{wd}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!streak.todayLogged && (
        <div className="mt-3 text-xs text-amber-800">
          ⚠ No activity logged today. Streak resumes if you log before midnight.
        </div>
      )}
    </div>
  );
}
