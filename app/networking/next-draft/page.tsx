// /networking/next-draft — Cadence-style queue showing which PRM contacts to
// message NEXT. Pairs with the MCP tools so you can ask Claude (any UI) to
// draft the message and save it back via save_networking_draft.

import Link from "next/link";
import {
  ExternalLink,
  Flame,
  Snowflake,
  AlertCircle,
  CalendarClock,
  UserPlus,
  Send,
  Sparkles,
  Copy,
} from "lucide-react";
import { getNetworkingNextDrafts, type NextDraftReason } from "@/lib/db/networking-next-drafts";

export const dynamic = "force-dynamic";

const REASON_META: Record<NextDraftReason, { label: string; icon: any; chip: string; explain: string }> = {
  follow_up_overdue: {
    label: "Follow-up overdue",
    icon: AlertCircle,
    chip: "bg-red-100 text-red-800 border-red-200",
    explain: "Their 'Next Follow-up' date in Notion has passed",
  },
  follow_up_today: {
    label: "Follow-up today",
    icon: CalendarClock,
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    explain: "Their 'Next Follow-up' date in Notion is today",
  },
  going_cold: {
    label: "Going cold",
    icon: Snowflake,
    chip: "bg-blue-100 text-blue-800 border-blue-200",
    explain: "Last contact was over 30 days ago",
  },
  never_messaged: {
    label: "Never messaged",
    icon: UserPlus,
    chip: "bg-violet-100 text-violet-800 border-violet-200",
    explain: "New contact — no draft or contact-date yet",
  },
  fresh_no_draft: {
    label: "No draft yet",
    icon: Sparkles,
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    explain: "You've talked, but haven't drafted a message in the app for them",
  },
};

export default async function NextDraftPage() {
  const queue = await getNetworkingNextDrafts(50);

  // Group by reason
  const byReason = new Map<NextDraftReason, typeof queue.items>();
  for (const item of queue.items) {
    if (!byReason.has(item.reason)) byReason.set(item.reason, []);
    byReason.get(item.reason)!.push(item);
  }
  const reasonOrder: NextDraftReason[] = [
    "follow_up_overdue",
    "follow_up_today",
    "going_cold",
    "fresh_no_draft",
    "never_messaged",
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
          Next-draft queue
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <Send className="size-7 text-stone-400" /> Networking · Next draft
        </h1>
        <p className="text-sm text-stone-500 mt-1 max-w-3xl">
          Cadence-style queue of who to message next. Pick a contact, then draft the message in
          Claude UI using the <code className="px-1 bg-stone-100 rounded">networking_next_drafts</code> →
          <code className="px-1 bg-stone-100 rounded">networking_message_context</code> →
          <code className="px-1 bg-stone-100 rounded">save_networking_draft</code> MCP tools.
        </p>
      </div>

      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-violet-600" />
          <h2 className="text-sm font-semibold text-violet-900">Draft from Claude UI</h2>
        </div>
        <p className="text-xs text-stone-700 mb-3">
          In Claude.ai / Claude Desktop with the MCP server connected, paste this prompt:
        </p>
        <pre className="text-[11px] bg-white border border-stone-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`Draft my next networking message.
1) Call networking_next_drafts to see who's queued.
2) Pick the top one (or one I name).
3) Call networking_message_context for their id.
4) Ask me for purpose, tone, framework, and topic if not obvious.
5) Generate 3 variants (short/standard/detailed).
6) Save them with save_networking_draft.
7) Tell me the /networking/<id> URL to review.`}
        </pre>
        <p className="text-[11px] text-stone-500 mt-2">
          Variants will appear in this contact's Message History feed. Copy + send from your actual social
          media account, then run <code className="px-1 bg-stone-100 rounded">mark_networking_message_sent</code>.
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={<AlertCircle className="size-3.5 text-red-700" />} label="Overdue" value={queue.totals.overdue} />
        <StatTile icon={<CalendarClock className="size-3.5 text-amber-700" />} label="Due today" value={queue.totals.dueToday} />
        <StatTile icon={<Snowflake className="size-3.5 text-blue-700" />} label="Going cold" value={queue.totals.goingCold} />
        <StatTile icon={<UserPlus className="size-3.5 text-violet-700" />} label="Never messaged" value={queue.totals.neverMessaged} />
      </section>

      {queue.items.length === 0 ? (
        <div className="surface p-12 text-center">
          <p className="text-sm text-stone-600 mb-1">Queue is empty 🎉</p>
          <p className="text-xs text-stone-500">
            No contacts due for follow-up, going cold, or pending first message.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {reasonOrder.map((reason) => {
            const items = byReason.get(reason);
            if (!items || items.length === 0) return null;
            const meta = REASON_META[reason];
            const Icon = meta.icon;
            return (
              <section key={reason} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-stone-600" />
                  <h3 className="text-sm font-semibold text-stone-900">
                    {meta.label}{" "}
                    <span className="text-stone-400 font-normal">({items.length})</span>
                  </h3>
                  <span className="text-[11px] text-stone-500">{meta.explain}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item) => {
                    const c = item.contact;
                    return (
                      <Link
                        key={c.id}
                        href={`/networking/${c.id}`}
                        className="surface surface-hover p-3 flex items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-900 truncate">
                              {c.name || "(no name)"}
                            </span>
                            <span className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium border ${meta.chip}`}>
                              {meta.label}
                            </span>
                            {item.hasDraftedBefore && (
                              <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] bg-stone-100 text-stone-600 border border-stone-200">
                                drafted before
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                            {[c.role || c.position, c.company, c.platform].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[11px] text-stone-500 tabular-nums">
                            {item.daysUntilFollowUp !== null
                              ? item.daysUntilFollowUp <= 0
                                ? `${Math.abs(item.daysUntilFollowUp)}d overdue`
                                : `in ${item.daysUntilFollowUp}d`
                              : item.daysSinceContact !== null
                              ? `${item.daysSinceContact}d since contact`
                              : "no contact yet"}
                          </span>
                          <code className="text-[10px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">
                            id: {c.id.slice(-6)}
                          </code>
                          {item.notionUrl && (
                            <a
                              href={item.notionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-400 hover:text-stone-900"
                              title="Open in Notion"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums text-stone-900">{value}</div>
    </div>
  );
}
