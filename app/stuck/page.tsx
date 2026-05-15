import { stuckDeals, STUCK_THRESHOLDS_DAYS } from "@/lib/db/stuck-deals";
import { StuckRow } from "@/components/stuck/stuck-row";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StuckPage() {
  const items = await stuckDeals();

  // Group by stage for visual structure
  const byStage = new Map<string, typeof items>();
  for (const i of items) {
    const s = i.contact.status ?? "(none)";
    if (!byStage.has(s)) byStage.set(s, []);
    byStage.get(s)!.push(i);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <AlertTriangle className="size-6 text-amber-500" /> Stuck deals
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Contacts that have stalled past the freshness threshold for their stage.
          Per-stage thresholds tuned to the Appsmove sales playbook (e.g., Proposal Sent → 4d, 1st Lead Follow up → 5d).
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="text-sm text-stone-600 mb-1">No stuck deals. Pipeline is moving.</p>
          <p className="text-xs text-stone-500">
            Items will appear here when a contact stays in a stage longer than its threshold ({STUCK_THRESHOLDS_DAYS["Proposal Sent"]}d for Proposal Sent, {STUCK_THRESHOLDS_DAYS["1st Lead Follow up"]}d for 1st Lead Follow up, etc.).
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-stone-600">
            {items.length} stuck across {byStage.size} stage{byStage.size === 1 ? "" : "s"}.
            Most overdue first.
          </div>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <StuckRow
                key={item.contact.id}
                contact={item.contact}
                daysStuck={item.daysStuck}
                threshold={item.threshold}
                overBy={item.overBy}
                suggestedAction={item.suggestedAction}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
