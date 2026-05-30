import Link from "next/link";
import { History, ExternalLink, Search } from "lucide-react";
import {
  getHistory,
  type HistoryEventType,
  type HistoryEvent,
  type HistoryCategory,
  ALL_TYPES,
  TYPES_BY_CATEGORY,
  ACTIVITY_SUBTYPES,
  ACTIVITY_SUBTYPE_LABEL,
} from "@/lib/db/history";
import { getOutreachSummary } from "@/lib/db/outreach-summary";
import { OutreachSummaryPanel } from "@/components/history/outreach-summary";
import { CHANNEL_LABELS, CHANNEL_COLORS, INBOX_CHANNELS, type InboxChannel } from "@/lib/inbox";

// Channels worth surfacing as filter pills (skip "comment" + "other" — they
// rarely match a single event source and just add noise to the pill row).
const PLATFORM_FILTER_CHANNELS: InboxChannel[] = [
  "linkedin", "x", "instagram", "facebook", "reddit", "discord", "whatsapp", "slack", "email",
];

export const dynamic = "force-dynamic";

const TONE_CLASSES: Record<string, string> = {
  stone:   "bg-stone-100 text-stone-700 border-stone-200",
  violet:  "bg-violet-100 text-violet-800 border-violet-200",
  blue:    "bg-blue-100 text-blue-800 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber:   "bg-amber-100 text-amber-800 border-amber-200",
  rose:    "bg-rose-100 text-rose-800 border-rose-200",
  indigo:  "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const RANGE_PRESETS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

const LABEL: Record<HistoryEventType, string> = {
  activity:          "Activities",
  meeting:           "Meetings",
  audit:             "Audits",
  deal_closed:       "Deals closed",
  tracker:           "Tracker",
  kpi_logged:        "Daily KPIs",
  content_created:   "Content ideas",
  content_published: "Published",
  sync:              "Sync",
};

const BADGE_TONE: Record<HistoryEventType, string> = {
  activity: "violet",
  meeting: "blue",
  audit: "amber",
  deal_closed: "rose",
  tracker: "stone",
  kpi_logged: "indigo",
  content_created: "stone",
  content_published: "emerald",
  sync: "stone",
};

const CATEGORY_TABS: { id: HistoryCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sales", label: "Sales" },
  { id: "marketing", label: "Marketing" },
  { id: "system", label: "System" },
];

type PageProps = {
  searchParams: Promise<{
    cat?: string;
    type?: string;
    range?: string;
    q?: string;       // contact search
    sub?: string;     // activity subtype filter (comma-separated)
    plat?: string;    // platform filter (single channel slug, e.g. "linkedin")
  }>;
};

export default async function HistoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Category
  const cat: HistoryCategory | "all" =
    sp.cat === "sales" || sp.cat === "marketing" || sp.cat === "system" ? sp.cat : "all";

  // Range
  const rangeKey = sp.range && RANGE_PRESETS[sp.range] ? sp.range : "30d";
  const days = RANGE_PRESETS[rangeKey];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Which types are valid under this category
  const typesInCategory: HistoryEventType[] =
    cat === "all" ? ALL_TYPES : TYPES_BY_CATEGORY[cat];

  // Type filter: comma-separated. When absent → all types in this category enabled.
  // Empty string in URL ("?type=") → zero types (explicit "none selected" — show empty state).
  let activeTypes: HistoryEventType[];
  if (sp.type === undefined) {
    activeTypes = typesInCategory;
  } else if (sp.type === "") {
    activeTypes = [];
  } else {
    const parsed = sp.type.split(",").filter((t) => typesInCategory.includes(t as HistoryEventType)) as HistoryEventType[];
    activeTypes = parsed;
  }

  const contactSearch = sp.q?.trim() || undefined;

  // Platform filter — single channel at a time. Validate against our channel list.
  const platformFilter: InboxChannel | undefined =
    sp.plat && (INBOX_CHANNELS as readonly string[]).includes(sp.plat)
      ? (sp.plat as InboxChannel)
      : undefined;

  // Activity subtype filter: when on Sales (or All) tab, lets you narrow to just
  // dm_sent or comment_drafted etc. Undefined → all subtypes.
  const activitySubtypes: string[] | undefined = sp.sub === undefined
    ? undefined
    : sp.sub === ""
      ? []
      : sp.sub.split(",").filter((s) => (ACTIVITY_SUBTYPES as readonly string[]).includes(s));

  const [events, summary] = await Promise.all([
    getHistory({
      types: activeTypes,
      activitySubtypes,
      platform: platformFilter,
      since,
      contactSearch,
      limit: 300,
    }),
    // Outreach summary is always for the full range — independent of type filters
    getOutreachSummary({ since }),
  ]);

  // Group by date
  const groups = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const dateKey = e.timestamp.toISOString().slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(e);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  // Helper: build a URL preserving the other params
  function buildUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      cat: cat === "all" ? undefined : cat,
      range: rangeKey === "30d" ? undefined : rangeKey,
      type: sp.type,
      q: contactSearch,
      sub: sp.sub,
      plat: platformFilter,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== null) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/history?${qs}` : "/history";
  }

  function toggleTypeUrl(t: HistoryEventType): string {
    const isOn = activeTypes.includes(t);
    const next = isOn ? activeTypes.filter((x) => x !== t) : [...activeTypes, t];
    if (next.length === typesInCategory.length) {
      return buildUrl({ type: undefined });
    }
    return buildUrl({ type: next.join(",") });
  }

  // Toggle a single subtype on/off
  function toggleSubtypeUrl(s: string): string {
    const current = activitySubtypes ?? [...ACTIVITY_SUBTYPES];
    const isOn = current.includes(s);
    const next = isOn ? current.filter((x) => x !== s) : [...current, s];
    if (next.length === ACTIVITY_SUBTYPES.length) {
      return buildUrl({ sub: undefined });
    }
    return buildUrl({ sub: next.join(",") });
  }
  const subtypesShown = cat === "all" || cat === "sales";
  const activeSubtypes = activitySubtypes ?? [...ACTIVITY_SUBTYPES];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Activity log</div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <History className="size-7 text-stone-400" /> History
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Everything that happened across sales, marketing, and system events. Filter by category, type, date, and contact.
        </p>
      </div>

      {/* INPUT vs OUTPUT scorecard — always for the selected date range, ignores type filters */}
      <OutreachSummaryPanel summary={summary} periodLabel={`last ${days}d`} />

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-stone-200 -mx-1">
        {CATEGORY_TABS.map((c) => {
          const active = cat === c.id;
          return (
            <Link
              key={c.id}
              href={buildUrl({ cat: c.id === "all" ? undefined : c.id, type: undefined })}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-stone-900 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-900"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Range pills */}
        <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
          {Object.keys(RANGE_PRESETS).map((k) => {
            const isActive = rangeKey === k;
            return (
              <Link
                key={k}
                href={buildUrl({ range: k })}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  isActive ? "bg-white text-stone-900 shadow-elevation-1" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {k}
              </Link>
            );
          })}
        </div>

        {/* Contact search */}
        <form action="/history" method="GET" className="flex items-center gap-2">
          {cat !== "all" && <input type="hidden" name="cat" value={cat} />}
          {rangeKey !== "30d" && <input type="hidden" name="range" value={rangeKey} />}
          {sp.type !== undefined && <input type="hidden" name="type" value={sp.type} />}
          <div className="relative">
            <Search className="size-3.5 absolute left-2 top-2.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={contactSearch ?? ""}
              placeholder="Search by contact name…"
              className="rounded-lg border border-stone-300 bg-white pl-7 pr-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 w-56"
            />
          </div>
          {contactSearch && (
            <Link href={buildUrl({ q: undefined })} className="text-xs text-stone-500 hover:text-stone-800">
              clear
            </Link>
          )}
        </form>

        <div className="ml-auto text-xs text-stone-500 tabular-nums">
          {events.length} event{events.length === 1 ? "" : "s"} · last {days}d
        </div>
      </div>

      {/* Type chips (within active category) */}
      <div className="flex flex-wrap gap-1.5">
        {typesInCategory.map((t) => {
          const isOn = activeTypes.includes(t);
          return (
            <Link
              key={t}
              href={toggleTypeUrl(t)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                isOn ? TONE_CLASSES[BADGE_TONE[t]] : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
              }`}
            >
              {LABEL[t]}
            </Link>
          );
        })}
        {activeTypes.length === 0 && (
          <Link
            href={buildUrl({ type: undefined })}
            className="text-xs px-2.5 py-1 rounded-md bg-stone-900 text-white"
          >
            Select all
          </Link>
        )}
      </div>

      {/* Activity subtype chips — only show when activity events are visible */}
      {subtypesShown && activeTypes.includes("activity") && (
        <div className="flex flex-wrap items-center gap-1.5 -mt-2">
          <span className="text-[10px] uppercase tracking-wide text-stone-400 mr-1">Activity:</span>
          {ACTIVITY_SUBTYPES.map((s) => {
            const isOn = activeSubtypes.includes(s);
            return (
              <Link
                key={s}
                href={toggleSubtypeUrl(s)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                  isOn ? "bg-violet-50 text-violet-800 border-violet-200" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                {ACTIVITY_SUBTYPE_LABEL[s]}
              </Link>
            );
          })}
          {activitySubtypes !== undefined && (
            <Link href={buildUrl({ sub: undefined })} className="text-[11px] text-stone-500 hover:text-stone-800 ml-1">
              reset
            </Link>
          )}
        </div>
      )}

      {/* Platform pills — narrow to events on a single channel. Sales, marketing,
          and content_published events all carry a normalized platform; events
          without one (tracker, KPI log, sync, content idea) drop out when a
          platform is selected. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-stone-400 mr-1">Platform:</span>
        <Link
          href={buildUrl({ plat: undefined })}
          className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
            !platformFilter
              ? "bg-stone-900 text-white border-stone-900"
              : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
          }`}
        >
          All
        </Link>
        {PLATFORM_FILTER_CHANNELS.map((ch) => {
          const isOn = platformFilter === ch;
          return (
            <Link
              key={ch}
              href={buildUrl({ plat: isOn ? undefined : ch })}
              className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                isOn ? CHANNEL_COLORS[ch] : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
              }`}
            >
              {CHANNEL_LABELS[ch]}
            </Link>
          );
        })}
      </div>

      {/* Events list */}
      {activeTypes.length === 0 ? (
        <div className="surface p-12 text-center">
          <p className="text-sm text-stone-600 mb-1">No event types selected.</p>
          <p className="text-xs text-stone-500">Click a chip above to enable a type.</p>
        </div>
      ) : events.length === 0 ? (
        <div className="surface p-12 text-center">
          <p className="text-sm text-stone-600 mb-1">
            No {cat === "all" ? "" : cat + " "}events in the last {days} days
            {platformFilter ? ` on ${CHANNEL_LABELS[platformFilter]}` : ""}
            {contactSearch ? ` matching "${contactSearch}"` : ""}.
          </p>
          <p className="text-xs text-stone-500">Try a wider date range or different filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedDates.map((dateKey) => {
            const date = new Date(dateKey);
            const dateLabel = date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
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

function EventRow({ event }: { event: HistoryEvent }) {
  const time = event.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isExternal = event.link?.startsWith("http");
  const linkProps = isExternal
    ? { href: event.link!, target: "_blank" as const, rel: "noopener noreferrer" }
    : { href: event.link ?? "#" };
  const inner = (
    <div className="surface surface-hover p-3 flex items-start gap-3">
      <span className="flex-shrink-0 text-[10px] tabular-nums text-stone-400 w-12 mt-0.5">{time}</span>
      <span
        className={`flex-shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${TONE_CLASSES[event.badge.tone]}`}
      >
        {event.badge.label}
      </span>
      {event.platform && (
        <span
          className={`flex-shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS[event.platform]}`}
        >
          {CHANNEL_LABELS[event.platform]}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-900 font-medium truncate">{event.title}</div>
        {event.summary && (
          <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">{event.summary}</div>
        )}
        {event.contactName && (
          <div className="text-[11px] text-stone-400 mt-0.5">↳ {event.contactName}</div>
        )}
      </div>
      {isExternal && <ExternalLink className="size-3.5 text-stone-400 flex-shrink-0 mt-1" />}
    </div>
  );
  return event.link ? <Link {...linkProps}>{inner}</Link> : <div>{inner}</div>;
}
