import { CHANNEL_COLORS, CHANNEL_LABELS, type InboxChannel } from "@/lib/inbox";
import type { PlatformDayCounts } from "@/lib/db/daily-kpis";

export function PlatformBreakdown({ rows }: { rows: PlatformDayCounts[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-sm font-semibold text-stone-900">By platform</div>
          <div className="text-xs text-stone-500">today</div>
        </div>
        <div className="text-sm text-stone-500 py-6 text-center">
          No activities logged today. As you draft DMs / comments / emails, they'll show here grouped by the contact's Notion Platform.
        </div>
      </div>
    );
  }

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-semibold text-stone-900">By platform</div>
        <div className="text-xs text-stone-500">{grandTotal} activities today</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left py-2 pr-3">Channel</th>
              <th className="text-center py-2 px-2" title="DMs sent">📨 DM</th>
              <th className="text-center py-2 px-2" title="Comments">💬 Cmt</th>
              <th className="text-center py-2 px-2" title="Follow-ups">↩️ F/up</th>
              <th className="text-center py-2 px-2" title="Emails">✉️ Email</th>
              <th className="text-center py-2 px-2" title="Posts observed">👁 Post</th>
              <th className="text-center py-2 px-2" title="Audits">🔍 Audit</th>
              <th className="text-center py-2 px-2" title="Notes">📝 Note</th>
              <th className="text-right py-2 pl-3 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => (
              <tr key={r.channel}>
                <td className="py-2 pr-3">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${CHANNEL_COLORS[r.channel]}`}>
                    {CHANNEL_LABELS[r.channel]}
                  </span>
                </td>
                <Cell n={r.dms} />
                <Cell n={r.comments} />
                <Cell n={r.followUps} />
                <Cell n={r.emails} />
                <Cell n={r.posts_observed} />
                <Cell n={r.audits} />
                <Cell n={r.notes} />
                <td className="py-2 pl-3 text-right font-semibold text-stone-900 tabular-nums">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Channels derived from each contact's <code className="px-1 bg-stone-100 rounded">Platform</code> field in Notion CRM. "Other" = activity logged on a contact with no platform set.
      </p>
    </div>
  );
}

function Cell({ n }: { n: number }) {
  return (
    <td className={`py-2 px-2 text-center tabular-nums ${n > 0 ? "text-stone-900 font-medium" : "text-stone-300"}`}>
      {n > 0 ? n : "·"}
    </td>
  );
}
