"use client";

// Notion "Person" ↔ user mapping health panel.
//
// Shows every distinct owner_name value from the CRM `contacts` table with
// the user it currently resolves to. Three match tiers:
//   - notion_person: explicit override → deterministic, green
//   - name:          exact name match → deterministic, green
//   - fuzzy:         similar-name match ("Saydur Rahman" ≈ "Saidur Rahaman")
//                    → tentative, amber, with a "Pin" button to promote to
//                    an explicit notion_person override
//   - unmapped:      no user matched → red, with a dropdown to assign

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, LinkIcon, Sparkles, Pin } from "lucide-react";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  notionPerson: string | null;
};

type OwnerMappingRow = {
  ownerName: string;
  contactCount: number;
  activityCount: number;
  mappedTo: UserSummary | null;
  matchedVia: "notion_person" | "name" | "fuzzy" | null;
};

export function OwnerMappingPanel({
  initial,
}: {
  initial: {
    users: UserSummary[];
    rows: OwnerMappingRow[];
    totalContactsWithOwner: number;
    totalContactsUnowned: number;
    mappedOwnerNames: number;
    unmappedOwnerNames: number;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mapTo(ownerName: string, userId: string) {
    setError(null);
    setBusy(ownerName);
    startTransition(async () => {
      try {
        // Setting notion_person on the user IS the mapping — the auto-sync
        // will resolve owner_name → this user on next run.
        const res = await fetch("/api/admin/users/notion-person", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, notionPerson: ownerName }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Mapping failed");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
          <LinkIcon className="size-4 text-stone-400" />
          Notion Person ↔ User mapping
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-3xl">
          The Notion CRM stores each contact's owner in the <code className="px-1 bg-stone-100 rounded">Person</code> column.
          Sell or Die attributes CRM activity to whichever app user matches that value —
          via the <code className="px-1 bg-stone-100 rounded">Notion Person</code> override,
          exact name, or a fuzzy match ("Saydur Rahman" ≈ "Saidur Rahaman").
          Notion is the source of truth: pin fuzzy matches to lock the Notion spelling as the user's override.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Owner values" value={initial.rows.length} />
        <StatTile label="Mapped" value={initial.mappedOwnerNames} tone="emerald" />
        <StatTile label="Unmapped" value={initial.unmappedOwnerNames} tone={initial.unmappedOwnerNames > 0 ? "red" : "stone"} />
        <StatTile label="Contacts w/ no owner" value={initial.totalContactsUnowned} tone={initial.totalContactsUnowned > 0 ? "amber" : "stone"} />
      </div>

      {error && (
        <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
          <AlertCircle className="size-3.5" /> {error}
        </div>
      )}

      {initial.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
          No <code>Person</code> values found on contacts yet. Set one on a lead in Notion and re-sync.
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="text-left px-3 py-2">Notion "Person"</th>
                <th className="text-left px-3 py-2 tabular-nums">Contacts</th>
                <th className="text-left px-3 py-2 tabular-nums hidden sm:table-cell">Activity (120d)</th>
                <th className="text-left px-3 py-2">Mapped to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {initial.rows.map((r) => {
                const isBusy = busy === r.ownerName;
                return (
                  <tr key={r.ownerName}>
                    <td className="px-3 py-2 font-medium text-stone-900">{r.ownerName}</td>
                    <td className="px-3 py-2 text-stone-700 tabular-nums">{r.contactCount}</td>
                    <td className="px-3 py-2 text-stone-500 tabular-nums hidden sm:table-cell">{r.activityCount}</td>
                    <td className="px-3 py-2">
                      {r.mappedTo && r.matchedVia === "fuzzy" ? (
                        <div className="inline-flex items-center gap-2 flex-wrap">
                          <Sparkles className="size-3.5 text-amber-600" />
                          <span className="text-stone-900">{r.mappedTo.name || r.mappedTo.email}</span>
                          <span className="text-[10px] text-amber-700 uppercase tracking-wide font-medium">
                            fuzzy
                          </span>
                          <button
                            type="button"
                            disabled={isBusy || pending}
                            onClick={() => mapTo(r.ownerName, r.mappedTo!.id)}
                            className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            title={`Pin "${r.ownerName}" as the Notion Person on ${r.mappedTo.name}. Locks the mapping so future syncs are deterministic.`}
                          >
                            {isBusy ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Pin className="size-3" />
                            )}
                            Pin
                          </button>
                        </div>
                      ) : r.mappedTo ? (
                        <div className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <span className="text-stone-900">{r.mappedTo.name || r.mappedTo.email}</span>
                          <span className="text-[10px] text-stone-400 uppercase tracking-wide">
                            via {r.matchedVia === "notion_person" ? "override" : "name"}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <AlertCircle className="size-3.5 text-red-500 flex-shrink-0" />
                          <select
                            disabled={isBusy || pending}
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) mapTo(r.ownerName, e.target.value);
                            }}
                            className="rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60"
                          >
                            <option value="">Map to user…</option>
                            {initial.users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name || u.email}
                              </option>
                            ))}
                          </select>
                          {isBusy && <Loader2 className="size-3.5 animate-spin text-stone-400" />}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "red" | "amber" | "stone";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" :
    tone === "red" ? "text-red-700" :
    tone === "amber" ? "text-amber-700" :
    "text-stone-900";
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-stone-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
