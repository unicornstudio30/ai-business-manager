import Link from "next/link";
import { History, ExternalLink } from "lucide-react";
import { getHistory, type HistoryEventType, type HistoryEvent } from "@/lib/db/history";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ALL_TYPES: HistoryEventType[] = [
  "activity",
  "meeting",
  "audit",
  "tracker",
  "sync",
  "content_published",
];

const TONE_CLASSES: Record<string, string> = {
  stone: "bg-stone-100 text-stone-700 border-stone-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
};

const RANGE_PRESETS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey = sp.range && RANGE_PRESETS[sp.range] ? sp.range : "30d";
  const days = RANGE_PRESETS[rangeKey];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Type filter: comma-separated, defaults to all
  const typeFilter = sp.type ? sp.type.split(",").filter((t) => ALL_TYPES.includes(t as HistoryEventType)) as HistoryEventType[] : ALL_TYPES;

  const events = await getHistory({ types: typeFilter, since, limit: 300 });

  // Group by date for visual sectioning
  const groups = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const dateKey = e.timestamp.toISOString().slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(e);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Activity log</div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <History className="size-7 text-stone-400" /> History
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Everything that happened — drafts, audits, meetings, sync events, content publishes. Filter by type and date.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Range filter */}
        <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
          {Object.keys(RANGE_PRESETS).map((k) => {
            const isActive = rangeKey === k;
            const params = new URLSearchParams();
            params.set("range", k);
            if (sp.type) params.set("type", sp.type);
            return (
              <Link
                key={k}
                href={`/history?${params.toString()}`}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${isActive ? "bg-white text-stone-900 shadow-elevation-1" : "text-stone-600 hover:text-stone-900"}`}
              >
                {k}
              </Link>
            );
          })}
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map((t) => {
            const isOn = typeFilter.includes(t);
            const nextSet = isOn ? typeFilter.filter((x) => x !== t) : [...typeFilter, t];
            const params = new URLSearchParams();
            params.set("range", rangeKey);
            if (nextSet.length > 0 && nextSet.length < ALL_TYPES.length) params.set("type", nextSet.join(","));
            return (
              <Link
                key={t}
                href={`/history?${params.toString()}`}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${isOn ? TONE_CLASSES[BADGE_TONE[t]] : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"}`}
              >
                {LABEL[t]}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto text-xs text-stone-500">
          {events.length} event{events.length === 1 ? "" : "s"} · last {days}d
        </div>
      </div>

      {events.length === 0 ? (
        <div className="surface p-12 text-center">
          <p className="text-sm text-stone-600 mb-1">No history matching these filters.</p>
          <p className="text-xs text-stone-500">Try a wider date range or different types.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedDates.map((dateKey) => {
            const date = new Date(dateKey);
            const dateLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
            return (
              <section key={dateKey}>
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2 sticky top-16 bg-stone-50/95 backdrop-blur py-1 z-10">
                  {dateLabel}
                </div>
                <div className="flex flex-col gap-2">
                  {groups.get(dateKey)!.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const BADGE_TONE: Record<HistoryEventType, string> = {
  activity: "violet",
  meeting: "blue",
  audit: "amber",
  tracker: "stone",
  sync: "stone",
  content_published: "emerald",
};

const LABEL: Record<HistoryEventType, string> = {
  activity: "Activity",
  meeting: "Meeting",
  audit: "Audit",
  tracker: "Tracker",
  sync: "Sync",
  content_published: "Published",
};

function EventRow({ event }: { event: HistoryEvent }) {
  const time = event.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const linkProps = event.link?.startsWith("http")
    ? { href: event.link, target: "_blank", rel: "noopener noreferrer" }
    : { href: event.link ?? "#" };
  const content = (
    <div className="surface surface-hover p-3 flex items-start gap-3">
      <span className="flex-shrink-0 text-[10px] tabular-nums text-stone-400 w-12 mt-0.5">{time}</span>
      <span className={`flex-shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${TONE_CLASSES[event.badge.tone]}`}>
        {event.badge.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-900 font-medium truncate">{event.title}</div>
        {event.summary && (
          <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">{event.summary}</div>
        )}
        {event.contactName && (
          <div className="text-[11px] text-stone-400 mt-0.5">↳ {event.contactName}</div>
        )}
      </div>
      {event.link?.startsWith("http") && <ExternalLink className="size-3.5 text-stone-400 flex-shrink-0 mt-1" />}
    </div>
  );
  return event.link ? <Link {...linkProps}>{content}</Link> : <div>{content}</div>;
}
