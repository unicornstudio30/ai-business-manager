import { CHANNEL_COLORS, CHANNEL_LABELS, INBOX_CHANNELS, type InboxChannel } from "@/lib/inbox";

type Day = {
  date: Date;
  byChannel: Partial<Record<InboxChannel, number>>;
  total: number;
};

export function Platform7DayGrid({ days }: { days: Day[] }) {
  // Pick channels that had any activity this week — keeps the grid compact
  const activeChannels = INBOX_CHANNELS.filter((ch) =>
    days.some((d) => (d.byChannel[ch] ?? 0) > 0)
  );

  const today = new Date();

  if (activeChannels.length === 0) {
    return null; // PlatformBreakdown component already handles the empty state
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-stone-900 mb-3">By platform — last 7 days</h2>
      <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left px-3 py-2 sticky left-0 bg-stone-50">Day</th>
              {activeChannels.map((ch) => (
                <th key={ch} className="text-center px-2 py-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS[ch]}`}>
                    {CHANNEL_LABELS[ch]}
                  </span>
                </th>
              ))}
              <th className="text-right px-3 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {days.map(({ date, byChannel, total }) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <tr key={date.toISOString()} className={isToday ? "bg-violet-50/40" : total === 0 ? "bg-amber-50/30" : ""}>
                  <td className="px-3 py-2 text-stone-700 text-xs whitespace-nowrap sticky left-0 bg-inherit">
                    <span className={isToday ? "font-semibold text-stone-900" : ""}>
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-stone-400 ml-1">{date.getDate()}</span>
                  </td>
                  {activeChannels.map((ch) => {
                    const n = byChannel[ch] ?? 0;
                    return (
                      <td
                        key={ch}
                        className={`px-2 py-2 text-center tabular-nums ${n > 0 ? "text-stone-900 font-medium" : "text-stone-300"}`}
                      >
                        {n > 0 ? n : "·"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-stone-900">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
