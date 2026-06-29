import Link from "next/link";
import { listContacts } from "@/lib/db/queries";
import { computeIcpScore, icpColor } from "@/lib/icp-scoring";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/stages";
import { fmtDate, daysAgo, parseJson } from "@/lib/utils";
import { db, schema } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; country?: string; platform?: string; sort?: string; mine?: string }>;
}) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  // Salespeople default to "my leads only"; admins/owner see all. The user
  // can override with ?mine=0 / ?mine=1 explicitly.
  const myLeadsDefault = me?.role === "salesperson";
  const myLeadsOn = sp.mine === undefined ? myLeadsDefault : sp.mine === "1";
  const rowsRaw = await listContacts({ ...sp, limit: 200 });
  const icpScores = new Map(rowsRaw.map((c) => [c.id, computeIcpScore(c).score]));

  // Load distinct statuses present in the synced data so the Stage filter
  // only shows what's actually in the CRM (not all 18 hardcoded stages).
  // Includes counts so user sees pipeline distribution at a glance.
  // Aggregate in JS — Drizzle's sql<count>`count(*)` aliasing varies by driver.
  const allStatusRows = await db
    .select({ status: schema.contacts.status })
    .from(schema.contacts);
  const statusCounts = new Map<string, number>();
  for (const r of allStatusRows) {
    if (!r.status) continue;
    statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  }
  // Order by canonical STAGES list (so Cold → Won flow is preserved),
  // then any unrecognized statuses go at the bottom.
  const orderedStatuses: { name: string; count: number }[] = [];
  for (const s of STAGES) {
    if (statusCounts.has(s)) orderedStatuses.push({ name: s, count: statusCounts.get(s)! });
  }
  for (const [s, n] of statusCounts) {
    if (!STAGES.includes(s as Stage)) orderedStatuses.push({ name: s, count: n });
  }
  // Apply "My leads" filter — match contact.ownerName to current user's name
  // (case-insensitive). Owner / admin still gets a toggle so they can drill
  // into one person's leads when needed.
  const matchOwner = (c: typeof rowsRaw[number]): boolean => {
    if (!myLeadsOn || !me) return true;
    const myName = (me.name || me.email.split("@")[0]).trim().toLowerCase();
    return (c.ownerName ?? "").trim().toLowerCase() === myName;
  };
  const filtered = rowsRaw.filter(matchOwner);

  // Default sort: ICP fit desc. Overrides: ?sort=name|status|date
  const rows = [...filtered].sort((a, b) => {
    if (sp.sort === "name") return (a.name || "").localeCompare(b.name || "");
    if (sp.sort === "status") return (a.status || "").localeCompare(b.status || "");
    if (sp.sort === "date") return (b.statusDate?.getTime() ?? 0) - (a.statusDate?.getTime() ?? 0);
    return (icpScores.get(b.id) ?? 0) - (icpScores.get(a.id) ?? 0);
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Contacts</h1>
        <div className="text-sm text-stone-500">{rows.length} shown · sorted by {sp.sort || "ICP fit"}</div>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-stone-600">
          Search
          <input
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Name or email"
            className="w-56 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-stone-600">
          Stage <span className="text-stone-400 font-normal">({orderedStatuses.length} active)</span>
          <select name="status" defaultValue={sp.status ?? ""} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {orderedStatuses.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-stone-600">
          Platform
          <select name="platform" defaultValue={sp.platform ?? ""} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="Linkedin">Linkedin</option>
            <option value="X">X</option>
            <option value="Facebook">Facebook</option>
            <option value="Whatsapp">Whatsapp</option>
            <option value="Slack">Slack</option>
            <option value="Reddit">Reddit</option>
          </select>
        </label>
        {me && (
          <label className="flex items-center gap-1.5 text-xs text-stone-700 self-end pb-1.5">
            <input
              type="checkbox"
              name="mine"
              value="1"
              defaultChecked={myLeadsOn}
              className="rounded border-stone-300"
            />
            My leads only
          </label>
        )}
        <button type="submit" className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white">
          Filter
        </button>
        {(sp.status || sp.search || sp.country || sp.platform || sp.mine) && (
          <Link href="/contacts" className="text-sm text-stone-500 hover:text-stone-900">
            Clear
          </Link>
        )}
      </form>

      {/* Desktop table — sm+ */}
      <div className="hidden sm:block rounded-xl border border-stone-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left px-4 py-2.5" title="ICP fit: how ideal a customer">
                <Link href="/contacts" className="hover:text-stone-900">ICP</Link>
              </th>
              <th className="text-left px-4 py-2.5">
                <Link href="/contacts?sort=name" className="hover:text-stone-900">Name</Link>
              </th>
              <th className="text-left px-4 py-2.5">
                <Link href="/contacts?sort=status" className="hover:text-stone-900">Stage</Link>
              </th>
              <th className="text-left px-4 py-2.5">Owner</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Platform</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Country</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">
                <Link href="/contacts?sort=date" className="hover:text-stone-900">Status Date</Link>
              </th>
              <th className="text-left px-4 py-2.5">Age</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Profession</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-stone-500">
                  No contacts yet. Click <span className="font-medium">Sync Notion</span> to pull from your Sales CRM.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const professions = parseJson<string[]>(c.profession, []);
                const age = daysAgo(c.statusDate);
                const icp = icpScores.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-10 rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums ${icpColor(icp)}`}>
                        {icp}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="text-stone-900 font-medium hover:underline">
                        {c.name || "(no name)"}
                      </Link>
                      {c.email && <div className="text-xs text-stone-500">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {c.status && (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[c.status as Stage] ?? "bg-stone-100 text-stone-800 border-stone-200"}`}>
                          {c.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.ownerName ? (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] bg-stone-100 text-stone-700 border border-stone-200">
                          {c.ownerName}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700 hidden md:table-cell">{c.platform || "—"}</td>
                    <td className="px-4 py-3 text-stone-700 hidden md:table-cell">{c.country || "—"}</td>
                    <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">{fmtDate(c.statusDate)}</td>
                    <td className="px-4 py-3 text-stone-500">{age !== null ? `${age}d` : "—"}</td>
                    <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">{professions.slice(0, 2).join(", ") || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — below sm */}
      <div className="sm:hidden flex flex-col gap-2">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            No contacts yet. Run Sync.
          </div>
        ) : (
          rows.map((c) => {
            const age = daysAgo(c.statusDate);
            const icp = icpScores.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="rounded-xl border border-stone-200 bg-white p-3 flex items-start gap-3 active:bg-stone-50"
              >
                <span className={`inline-flex flex-shrink-0 items-center justify-center w-10 h-8 rounded-md border text-xs font-medium tabular-nums ${icpColor(icp)}`}>
                  {icp}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900 truncate">{c.name || "(no name)"}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {c.status && (
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STAGE_COLORS[c.status as Stage] ?? "bg-stone-100 text-stone-800 border-stone-200"}`}>
                        {c.status}
                      </span>
                    )}
                    {c.platform && <span className="text-[10px] text-stone-500">{c.platform}</span>}
                    {c.ownerName && (
                      <span className="text-[10px] text-stone-500">· owner: {c.ownerName}</span>
                    )}
                    {age !== null && <span className="text-[10px] text-stone-400">· {age}d</span>}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
