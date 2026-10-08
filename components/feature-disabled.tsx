// Shown in place of a page whose feature is turned off (lib/feature-flags.ts).

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { DISABLED_REASON, type FeatureFlag } from "@/lib/feature-flags";

export function FeatureDisabled({ flag, title }: { flag: FeatureFlag; title: string }) {
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
      <div className="rounded-xl border border-stone-200 bg-white p-6 flex gap-3">
        <ArrowRightLeft className="size-5 text-stone-400 shrink-0 mt-0.5" />
        <div className="text-sm text-stone-700">
          <p>{DISABLED_REASON[flag]}</p>
          <p className="mt-2 text-xs text-stone-500">
            PBM is now a read-only reporting layer. To turn this back on, set{" "}
            <code className="px-1 bg-stone-100 rounded">PBM_FLAG_{flag}=on</code>.
          </p>
          <Link href="/" className="mt-3 inline-block text-xs font-medium text-stone-900 hover:underline">
            Back to the dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
