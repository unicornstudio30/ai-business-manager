// Networking analytics dashboard — entirely derived from your synced Notion
// PRM rows + locally-saved drafted messages. Read-only; everything updates by
// editing the PRM in Notion and syncing.

import Link from "next/link";
import {
  Users,
  AlertCircle,
  CalendarClock,
  MessageSquare,
  Snowflake,
  Sparkles,
  Calendar,
  Flame,
  TrendingUp,
} from "lucide-react";
import type { NetworkingAnalytics } from "@/lib/db/networking-analytics";
import { fmtDate } from "@/lib/utils";

export function NetworkingAnalyticsDashboard({ data }: { data: NetworkingAnalytics }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Headline KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiTile
          icon={<Users className="size-3.5" />}
          label="Total contacts"
          value={data.total}
          sub={`+${data.newLast30Days} in 30d`}
        />
        <KpiTile
          icon={<AlertCircle className="size-3.5" />}
          label="Overdue follow-ups"
          value={data.overdueFollowUps}
          tone={data.overdueFollowUps > 0 ? "amber" : undefined}
        />
        <KpiTile
          icon={<CalendarClock className="size-3.5" />}
          label="Due this week"
          value={data.followUpsDueThisWeek}
          tone={data.followUpsDueThisWeek > 0 ? "blue" : undefined}
        />
        <KpiTile
          icon={<Snowflake className="size-3.5" />}
          label="Going cold (31-90d)"
          value={data.goingCold}
          tone={data.goingCold > 0 ? "blue" : undefined}
        />
        <KpiTile
          icon={<Snowflake className="size-3.5" />}
          label="Cold (90d+)"
          value={data.veryCold}
          tone={data.veryCold > 0 ? "rose" : undefined}
        />
        <KpiTile
          icon={<MessageSquare className="size-3.5" />}
          label="Messages drafted"
          value={data.totalMessagesDrafted}
          sub={`${data.messagesLast30Days} in 30d`}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Freshness histogram */}
        <Card title="Contact freshness" subtitle="Time since last contact (from Notion)">
          <FreshnessChart data={data.byFreshness} />
        </Card>

        {/* Stage distribution */}
        <Card title="By stage" subtitle="Networking pipeline distribution">
          {data.byStage.length === 0 ? (
            <EmptyChart hint="Set 'Stage' on contacts in Notion to see this." />
          ) : (
            <HorizontalBars
              items={data.byStage.map((s) => ({ label: s.stage, value: s.count }))}
              tone="violet"
            />
          )}
        </Card>

        {/* Relationship distribution */}
        <Card title="By relationship" subtitle="How you know them">
          {data.byRelationship.length === 0 ? (
            <EmptyChart hint="Set 'Relationship' on contacts in Notion to see this." />
          ) : (
            <HorizontalBars
              items={data.byRelationship.map((r) => ({ label: r.relationship, value: r.count }))}
              tone="blue"
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message activity sparkline */}
        <Card
          title="Messages drafted · last 14 days"
          subtitle="From the Write Message wizard"
        >
          <ActivitySparkline data={data.messageActivity14Day} />
        </Card>

        {/* Framework + tone usage */}
        <Card title="Most-used frameworks &amp; tones" subtitle="From your drafts">
          {data.byFramework.length === 0 && data.byTone.length === 0 ? (
            <EmptyChart hint="No drafts yet. Use the wizard on any contact to start." />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-1">
                  <Sparkles className="size-3" /> Framework
                </div>
                <HorizontalBars
                  items={data.byFramework.slice(0, 5).map((f) => ({ label: f.framework, value: f.count }))}
                  tone="violet"
                  compact
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-1">
                  <Flame className="size-3" /> Tone
                </div>
                <HorizontalBars
                  items={data.byTone.slice(0, 5).map((t) => ({ label: t.tone, value: t.count }))}
                  tone="amber"
                  compact
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming follow-ups */}
        <Card title="Upcoming follow-ups · next 14 days" subtitle="From 'Next Follow-up' in Notion">
          {data.upcomingFollowUps.length === 0 ? (
            <EmptyChart hint="No follow-ups scheduled. Add 'Next Follow-up' dates in Notion to plan touches." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.upcomingFollowUps.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/networking/${c.id}`} className="text-stone-800 hover:underline truncate flex-1 min-w-0">
                    {c.name}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 flex-shrink-0">
                    {c.relationship && <span className="text-stone-600">{c.relationship}</span>}
                    <span className="tabular-nums">
                      {c.daysUntil <= 0 ? "Today" : c.daysUntil === 1 ? "Tomorrow" : `in ${c.daysUntil}d`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Oldest untouched */}
        <Card title="Oldest untouched" subtitle="Re-warm these next">
          {data.oldestUntouched.length === 0 ? (
            <EmptyChart hint="Nothing here means all your contacts are warm — good problem." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.oldestUntouched.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/networking/${c.id}`} className="text-stone-800 hover:underline truncate flex-1 min-w-0">
                    {c.name}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 flex-shrink-0">
                    {c.relationship && <span className="text-stone-600">{c.relationship}</span>}
                    <span className={`tabular-nums ${c.daysSinceContact && c.daysSinceContact >= 90 ? "text-rose-600 font-semibold" : c.daysSinceContact && c.daysSinceContact >= 30 ? "text-amber-700" : ""}`}>
                      {c.daysSinceContact === null ? "Never" : `${c.daysSinceContact}d ago`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── primitives ────────────────────────────────────────────────────────────────

function KpiTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone?: "amber" | "blue" | "rose" | "emerald";
}) {
  const valColor =
    tone === "amber" ? "text-amber-700"
    : tone === "blue" ? "text-blue-700"
    : tone === "rose" ? "text-rose-700"
    : tone === "emerald" ? "text-emerald-700"
    : "text-stone-900";
  return (
    <div className="surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-500 mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${valColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="surface p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ hint }: { hint: string }) {
  return <div className="text-xs text-stone-400 py-6 text-center">{hint}</div>;
}

function HorizontalBars({
  items,
  tone = "stone",
  compact = false,
}: {
  items: { label: string; value: number }[];
  tone?: "stone" | "violet" | "blue" | "amber" | "emerald";
  compact?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const barColor =
    tone === "violet" ? "bg-violet-400"
    : tone === "blue" ? "bg-blue-400"
    : tone === "amber" ? "bg-amber-400"
    : tone === "emerald" ? "bg-emerald-400"
    : "bg-stone-400";
  return (
    <ul className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
      {items.map((it) => {
        const pct = Math.round((it.value / max) * 100);
        return (
          <li key={it.label}>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-stone-700 truncate pr-2">{it.label}</span>
              <span className="text-stone-500 tabular-nums">{it.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div className={`${barColor} h-full`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FreshnessChart({ data }: { data: NetworkingAnalytics["byFreshness"] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyChart hint="Set 'Last Contact' dates in Notion to see freshness." />;
  const max = Math.max(1, ...data.map((d) => d.count));
  const tone: Record<string, string> = {
    fresh: "bg-emerald-500",
    warm: "bg-emerald-300",
    cooling: "bg-amber-400",
    cold: "bg-rose-500",
    never: "bg-stone-300",
  };
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => {
        const h = Math.max(3, Math.round((d.count / max) * 100));
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[10px] tabular-nums text-stone-700">{d.count}</div>
            <div
              className={`w-full rounded-t-sm ${tone[d.bucket]}`}
              style={{ height: `${h}%` }}
            />
            <div className="text-[9px] text-stone-500 text-center leading-tight">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActivitySparkline({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-semibold tabular-nums text-stone-900">{total}</span>
        <span className="text-[11px] text-stone-500">drafts in last 14 days</span>
      </div>
      <div className="flex items-end gap-1 h-20">
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.count / max) * 100));
          const isToday = i === data.length - 1;
          return (
            <div
              key={d.date}
              className={`flex-1 rounded-sm ${d.count > 0 ? (isToday ? "bg-violet-500" : "bg-violet-300") : "bg-stone-100"}`}
              style={{ height: `${h}%` }}
              title={`${d.date}: ${d.count}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-stone-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
