import Link from "next/link";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import type { StuckDeal } from "@/lib/db/stuck-deals";

export function StuckWidget({ items }: { items: StuckDeal[] }) {
  const top = items.slice(0, 3);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" /> Stuck deals
        </div>
        <Link href="/stuck" className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="text-3xl font-semibold text-stone-900 tabular-nums mb-3">{items.length}</div>

      {top.length === 0 ? (
        <div className="text-sm text-stone-500 py-4 text-center">Pipeline moving. Nothing stuck.</div>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {top.map((item) => (
            <li key={item.contact.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link href={`/contacts/${item.contact.id}`} className="text-sm font-medium text-stone-900 truncate block hover:underline">
                  {item.contact.name}
                </Link>
                <div className="text-xs text-stone-500 truncate">
                  +{item.overBy}d over · {item.suggestedAction}
                </div>
              </div>
              {item.contact.status && (
                <span className={`text-[11px] rounded px-1.5 py-0.5 border whitespace-nowrap ${STAGE_COLORS[item.contact.status as Stage]}`}>
                  {item.contact.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
