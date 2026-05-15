import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { AuditCard } from "@/components/audits/audit-card";
import { ScanSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const [audits, contacts] = await Promise.all([
    db.select().from(schema.audits).orderBy(desc(schema.audits.createdAt)).limit(100),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
  ]);

  const contactName = new Map(contacts.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <ScanSearch className="size-6 text-stone-400" /> Site Audits
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Audits Claude runs via <code className="px-1 bg-stone-100 rounded text-xs">/audit &lt;url&gt;</code> in Claude Code.
          Each audit comes with a drafted ACA outreach email — copy, personalize, send.
        </p>
      </div>

      {audits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <ScanSearch className="size-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-600 mb-2">No audits yet.</p>
          <p className="text-xs text-stone-500">
            Run <code className="px-1.5 py-0.5 bg-stone-100 rounded">/audit https://prospect-site.com</code> in Claude Code.
            <br />
            Optionally pass <code className="px-1.5 py-0.5 bg-stone-100 rounded">--contact-id=&lt;id&gt;</code> to link the audit to a contact.
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-stone-600">
            {audits.length} audit{audits.length === 1 ? "" : "s"} · most recent first
          </div>
          <div className="flex flex-col gap-4">
            {audits.map((a) => (
              <AuditCard
                key={a.id}
                audit={a}
                contactName={a.contactId ? contactName.get(a.contactId) : null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
