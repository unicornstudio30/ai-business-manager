import Link from "next/link";
import { listContacts } from "@/lib/db/queries";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/stages";
import { fmtDate, daysAgo, parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; country?: string; platform?: string }>;
}) {
  const sp = await searchParams;
  const rows = await listContacts({ ...sp, limit: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Contacts</h1>
        <div className="text-sm text-stone-500">{rows.length} shown</div>
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
          Stage
          <select name="status" defaultValue={sp.status ?? ""} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
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
        <button type="submit" className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white">
          Filter
        </button>
        {(sp.status || sp.search || sp.country || sp.platform) && (
          <Link href="/contacts" className="text-sm text-stone-500 hover:text-stone-900">
            Clear
          </Link>
        )}
      </form>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Stage</th>
              <th className="text-left px-4 py-2.5">Platform</th>
              <th className="text-left px-4 py-2.5">Country</th>
              <th className="text-left px-4 py-2.5">Status Date</th>
              <th className="text-left px-4 py-2.5">Age</th>
              <th className="text-left px-4 py-2.5">Profession</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-stone-500">
                  No contacts yet. Click <span className="font-medium">Sync Notion</span> to pull from your Sales CRM.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const professions = parseJson<string[]>(c.profession, []);
                const age = daysAgo(c.statusDate);
                return (
                  <tr key={c.id} className="hover:bg-stone-50">
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
                    <td className="px-4 py-3 text-stone-700">{c.platform || "—"}</td>
                    <td className="px-4 py-3 text-stone-700">{c.country || "—"}</td>
                    <td className="px-4 py-3 text-stone-500">{fmtDate(c.statusDate)}</td>
                    <td className="px-4 py-3 text-stone-500">{age !== null ? `${age}d` : "—"}</td>
                    <td className="px-4 py-3 text-stone-500">{professions.slice(0, 2).join(", ") || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
