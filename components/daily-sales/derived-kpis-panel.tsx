// Comprehensive read-out of every KPI derived from Notion CRM today.
// Three sub-panels: Outreach (input), Outcomes (output), Pipeline movement.

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  CalendarCheck,
  AlertCircle,
  ExternalLink,
  Send,
  Reply,
  Trophy,
  FileText,
  Phone,
  Users,
} from "lucide-react";
import { fmtDate } from "@/lib/utils";
import type { DerivedKpis } from "@/lib/db/notion-derived-kpis";

const CHANNEL_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  reddit: "Reddit",
  email: "Email",
  whatsapp: "WhatsApp",
  slack: "Slack",
  other: "Other",
};

function PlatformList({ map }: { map: DerivedKpis["connectionsSent"]["byPlatform"] }) {
  const entries = Object.entries(map).filter(([_, n]) => n > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(([ch, n]) => (
        <span key={ch} className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-700">
          {CHANNEL_LABEL[ch] ?? ch}: <span className="font-semibold tabular-nums">{n}</span>
        </span>
      ))}
    </div>
  );
}

function Tile({ icon, label, value, sub, tone }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "stone";
}) {
  const toneColor = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
    stone: "text-stone-900",
  }[tone ?? "stone"];
  return (
    <div className="surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-500 mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${toneColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function DerivedKpisPanel({ kpis }: { kpis: DerivedKpis }) {
  const crmDbUrl = "https://www.notion.so/35d0b601369a80519256ec4232d5f6a8";

  return (
    <div className="flex flex-col gap-5">
      {/* Input / Output overview */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <section className="surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="size-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Input today</span>
            <span className="ml-auto text-2xl font-semibold tabular-nums text-stone-900">{kpis.totalActions}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5" title="Contacts moved to '1st message' status today — DMs to already-connected people">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">1st messages (connected)</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.connectionsSent.total}</div>
              <PlatformList map={kpis.connectionsSent.byPlatform} />
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5" title="Contacts moved to 'In-mail' status today — cold first message to non-connections">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">InMails (cold)</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.inmailsSent.total}</div>
              <PlatformList map={kpis.inmailsSent.byPlatform} />
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Follow-ups</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.followUpsSent.total}</div>
              <PlatformList map={kpis.followUpsSent.byPlatform} />
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5" title="Derived from Engage Touch increments in Notion CRM">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Comments / engagement</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.commentsToday.total}</div>
              <PlatformList map={kpis.commentsToday.byPlatform} />
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Lead magnets</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.leadMagnetsSent}</div>
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Conversations</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.conversationsOpened}</div>
            </div>
          </div>
        </section>

        {/* Conversion rate */}
        <section className="surface p-5 flex flex-col items-center justify-center min-w-[140px]">
          <TrendingUp className="size-4 text-stone-400 mb-1" />
          <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Response rate</div>
          <div className="text-2xl font-semibold tabular-nums text-stone-900 mt-1">
            {kpis.responseRate === null ? "—" : `${kpis.responseRate}%`}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {kpis.responsesReceived} / {kpis.connectionsSent.total + kpis.inmailsSent.total} today
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownRight className="size-4 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Output today</span>
            <span className="ml-auto text-2xl font-semibold tabular-nums text-stone-900">{kpis.totalOutcomes}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Responses</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.responsesReceived}</div>
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Qualified</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.qualifications}</div>
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Proposals</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.proposalsSent}</div>
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Bookings</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.bookings}</div>
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Calls held</div>
              <div className="text-base font-semibold tabular-nums text-stone-900">{kpis.callsHeld}</div>
            </div>
            <div className="rounded-lg bg-stone-50/60 border border-stone-200/60 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Wins</div>
              <div className="text-base font-semibold tabular-nums text-emerald-700">{kpis.dealsWon}</div>
            </div>
          </div>
        </section>
      </div>

      {/* Pipeline snapshot */}
      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Pipeline snapshot</h2>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          <Tile icon={<Users className="size-3" />} label="Total" value={kpis.pipeline.total} />
          <Tile icon={null} label="Cold" value={kpis.pipeline.cold} tone="stone" />
          <Tile icon={null} label="Engaged" value={kpis.pipeline.engaged} tone="blue" />
          <Tile icon={null} label="Qualified" value={kpis.pipeline.qualified} tone="violet" />
          <Tile icon={null} label="Proposal" value={kpis.pipeline.proposal} tone="amber" />
          <Tile icon={null} label="Booking" value={kpis.pipeline.booking} tone="rose" />
          <Tile icon={<Trophy className="size-3" />} label="Closed" value={kpis.pipeline.closed} tone="emerald" />
        </div>
        <div className="mt-2 text-[11px] text-stone-500">
          + {kpis.newProspects} new prospects today ({kpis.inboundLeads} inbound)
        </div>
      </section>

      {/* Today's specific events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meetings today */}
        <section className="surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CalendarCheck className="size-4 text-rose-600" />
              <h3 className="text-sm font-semibold text-stone-900">Meetings today</h3>
            </div>
            <span className="text-xs text-stone-400 tabular-nums">{kpis.meetingsToday.length}</span>
          </div>
          {kpis.meetingsToday.length === 0 ? (
            <div className="text-xs text-stone-400">none</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {kpis.meetingsToday.map((m) => (
                <li key={m.id} className="text-xs">
                  <Link href={`/contacts/${m.id}`} className="text-stone-800 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-stone-400"> · {m.status}</span>
                  {m.platform && <span className="text-stone-400"> · {m.platform}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Connections today */}
        <section className="surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Send className="size-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-stone-900">Connections today</h3>
            </div>
            <span className="text-xs text-stone-400 tabular-nums">{kpis.newConnectionsToday.length}</span>
          </div>
          {kpis.newConnectionsToday.length === 0 ? (
            <div className="text-xs text-stone-400">none</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {kpis.newConnectionsToday.slice(0, 6).map((c) => (
                <li key={c.id} className="text-xs">
                  <Link href={`/contacts/${c.id}`} className="text-stone-800 hover:underline">
                    {c.name}
                  </Link>
                  {c.platform && <span className="text-stone-400"> · {c.platform}</span>}
                </li>
              ))}
              {kpis.newConnectionsToday.length > 6 && (
                <li className="text-[10px] text-stone-400">+{kpis.newConnectionsToday.length - 6} more</li>
              )}
            </ul>
          )}
        </section>

        {/* Proposals today */}
        <section className="surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-stone-900">Proposals today</h3>
            </div>
            <span className="text-xs text-stone-400 tabular-nums">{kpis.newProposalsToday.length}</span>
          </div>
          {kpis.newProposalsToday.length === 0 ? (
            <div className="text-xs text-stone-400">none</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {kpis.newProposalsToday.map((p) => (
                <li key={p.id} className="text-xs">
                  <Link href={`/contacts/${p.id}`} className="text-stone-800 hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-stone-400"> · {fmtDate(p.statusDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Sequence step distribution + multi-channel contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engage Touch distribution */}
        <section className="surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-900">Sequence step distribution</h3>
            <span className="text-[11px] text-stone-400">where contacts are stalling</span>
          </div>
          {(() => {
            const dist = kpis.engageTouchDistribution;
            const steps = ["0", "1", "2", "3", "4", "5"];
            const max = Math.max(1, ...steps.map((s) => dist[s] ?? 0));
            return (
              <div className="flex items-end gap-2 h-24">
                {steps.map((s) => {
                  const count = dist[s] ?? 0;
                  const h = Math.max(4, Math.round((count / max) * 80));
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] tabular-nums text-stone-700">{count}</div>
                      <div
                        className={`w-full rounded-t-sm ${count > 0 ? "bg-violet-400" : "bg-stone-200"}`}
                        style={{ height: `${h}px` }}
                      />
                      <div className="text-[10px] text-stone-500">{s === "0" ? "—" : `Step ${s}`}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="text-[11px] text-stone-400 mt-2">
            Tall bars at low steps = lots of contacts not yet contacted. Tall at step 4–5 = sequence working but no conversion.
          </div>
        </section>

        {/* Multi-channel pursuit */}
        <section className="surface p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-900">Multi-channel pursuit</h3>
            <span className="text-xs text-stone-400 tabular-nums">{kpis.multiChannelContacts.length}</span>
          </div>
          <div className="text-[11px] text-stone-500 mb-2">
            Active contacts with 2+ Cross outreach channels in Notion (you're working them across platforms).
          </div>
          {kpis.multiChannelContacts.length === 0 ? (
            <div className="text-xs text-stone-400">No multi-channel pursuits yet — fill the Cross outreach column in Notion to flag them.</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {kpis.multiChannelContacts.slice(0, 5).map((m) => (
                <li key={m.id} className="text-xs flex items-center gap-2">
                  <Link href={`/contacts/${m.id}`} className="text-stone-800 hover:underline truncate">
                    {m.name}
                  </Link>
                  <span className="text-stone-400">·</span>
                  <span className="text-stone-500">{m.status}</span>
                  <span className="ml-auto flex gap-1">
                    {m.channels.map((ch) => (
                      <span key={ch} className="rounded bg-stone-100 px-1 py-0 text-[10px] text-stone-700">{ch}</span>
                    ))}
                  </span>
                </li>
              ))}
              {kpis.multiChannelContacts.length > 5 && (
                <li className="text-[10px] text-stone-400">+{kpis.multiChannelContacts.length - 5} more</li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* Overdue follow-ups */}
      {kpis.followUpsOverdue.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="size-4 text-amber-700" />
              <h3 className="text-sm font-semibold text-amber-900">Overdue follow-ups</h3>
              <span className="text-xs text-amber-700 tabular-nums">({kpis.followUpsOverdue.length})</span>
            </div>
            <Link
              href={crmDbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
            >
              Open CRM <ExternalLink className="size-3" />
            </Link>
          </div>
          <ul className="flex flex-col gap-1">
            {kpis.followUpsOverdue.slice(0, 6).map((f) => (
              <li key={f.id} className="text-xs flex items-center justify-between gap-2">
                <Link href={`/contacts/${f.id}`} className="text-stone-800 hover:underline truncate">
                  {f.name}
                </Link>
                <span className="text-stone-500">{f.status}</span>
                <span className="text-amber-700 font-semibold tabular-nums">{f.daysLate}d late</span>
              </li>
            ))}
            {kpis.followUpsOverdue.length > 6 && (
              <li className="text-[10px] text-amber-700">+{kpis.followUpsOverdue.length - 6} more</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
