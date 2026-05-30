import { syncStatus } from "@/lib/notion/sync";
import { fmtDateTime } from "@/lib/utils";
import { NotionColumnsSetup } from "@/components/settings/notion-columns-setup";
import { OutreachLimitsForm } from "@/components/settings/outreach-limits-form";
import { PrmSetup } from "@/components/settings/prm-setup";
import { getOutreachConfig, buildEffectiveLimits } from "@/lib/outreach-config";
import { getPrmConfig } from "@/lib/notion/prm-config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [status, outreachConfig, prmConfig] = await Promise.all([
    syncStatus(),
    getOutreachConfig(),
    getPrmConfig(),
  ]);
  // The form needs the defaults (labels + baseline numbers) AND the current
  // saved overrides so it can pre-populate the inputs.
  const effective = buildEffectiveLimits({}); // pure defaults, no overrides applied
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>

      <OutreachLimitsForm defaults={effective as any} initial={outreachConfig} />

      <PrmSetup initial={{ configured: !!prmConfig, databaseId: prmConfig?.databaseId, dataSourceId: prmConfig?.dataSourceId, rawUrl: prmConfig?.rawUrl }} />

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="text-sm font-semibold text-stone-900 mb-3">Notion integration</div>
        <div className="text-sm text-stone-700 mb-4">
          {status.configured ? (
            <span className="text-green-700">✓ Configured</span>
          ) : (
            <span className="text-amber-800">⚠ NOTION_TOKEN not set</span>
          )}
        </div>
        {!status.configured && (
          <div className="rounded-lg bg-stone-50 p-4 text-sm text-stone-700 leading-relaxed">
            <div className="font-medium mb-2">5-minute setup:</div>
            <ol className="list-decimal list-inside space-y-1.5 text-stone-700">
              <li>Go to <a className="text-blue-600 hover:underline" href="https://www.notion.so/profile/integrations" target="_blank" rel="noopener noreferrer">notion.so/profile/integrations</a> → New integration → name it &ldquo;Unicorn Studio Business Manager&rdquo;.</li>
              <li>Copy the Internal Integration Token.</li>
              <li>Create <code className="px-1.5 py-0.5 bg-stone-200 rounded">.env.local</code> in this project with: <code className="block mt-1 px-2 py-1 bg-stone-200 rounded text-xs">NOTION_TOKEN=secret_...</code></li>
              <li>In Notion, open each of your 3 databases — Sales CRM, Sales tracker, Content Calendar — click &hellip; → Add connections → select your integration.</li>
              <li>Restart <code className="px-1.5 py-0.5 bg-stone-200 rounded">npm run dev</code> and click Sync.</li>
            </ol>
          </div>
        )}
      </section>

      <NotionColumnsSetup />

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="text-sm font-semibold text-stone-900 mb-3">Recent sync activity</div>
        {status.recent.length === 0 ? (
          <div className="text-sm text-stone-500">No syncs yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="text-left py-1.5">Entity</th>
                <th className="text-left py-1.5">Dir</th>
                <th className="text-left py-1.5">Rows</th>
                <th className="text-left py-1.5">When</th>
                <th className="text-left py-1.5">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {status.recent.slice(0, 10).map((r, i) => (
                <tr key={i}>
                  <td className="py-2 text-stone-800">{r.entity}</td>
                  <td className="py-2 text-stone-700">{r.direction}</td>
                  <td className="py-2 text-stone-700 tabular-nums">{r.rowsChanged}</td>
                  <td className="py-2 text-stone-500">{fmtDateTime(r.finishedAt)}</td>
                  <td className="py-2 text-red-600 text-xs">{r.error || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="text-sm font-semibold text-stone-900 mb-3">Strategy documents</div>
        <p className="text-sm text-stone-600 leading-relaxed">
          Strategy docs are stored in <code className="px-1.5 py-0.5 bg-stone-100 rounded">/strategy/</code>. Claude reads these on every slash command to maintain voice and methodology consistency.
        </p>
        <ul className="mt-3 text-sm text-stone-700 list-disc list-inside space-y-1">
          <li>unicorn-positioning.md — Unicorn Studio offer + ICP + voice</li>
          <li>unicorn-sales-playbook.md — ACA adapted to direct-to-client + DM sequences</li>
          <li>unicorn-content-pillars.md — content angles for AI SaaS founder audience</li>
          <li>appsmove-*.md (5 files) — framework reference (ACA, hook system, sprint cadence)</li>
        </ul>
        <p className="text-xs text-stone-500 mt-3">
          Run <code>/sync-strategy</code> in Claude Code to refresh from Google Drive.
        </p>
      </section>
    </div>
  );
}
