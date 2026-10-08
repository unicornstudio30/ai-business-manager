"use client";

// Seat picker for per-seat reporting. Writes ?seat=<Notion Person value> to
// the URL (keeping other params) so server components can filter.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Users } from "lucide-react";

export type SeatOption = { name: string; contactCount: number; mapped: boolean };

export function SeatFilter({ seats, current }: { seats: SeatOption[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("seat", value);
    else next.delete("seat");
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-stone-600">
      <Users className="size-4 text-stone-400" />
      <span className="sr-only sm:not-sr-only">Seat</span>
      <select
        value={current ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-60"
      >
        <option value="">All seats</option>
        {seats.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name} ({s.contactCount}){s.mapped ? "" : " · no app user"}
          </option>
        ))}
      </select>
    </label>
  );
}
