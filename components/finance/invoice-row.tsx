"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_COLORS, INVOICE_STATUSES, fmtMoney, type InvoiceStatus } from "@/lib/finance";
import { fmtDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Entry = {
  id: string;
  date: Date | string | null;
  contactId: string | null;
  projectId: string | null;
  lineItem: string | null;
  amount: number | null;
  status: string | null;
  paymentDate: Date | string | null;
  notes: string | null;
};

export function InvoiceRow({
  entry,
  contactName,
  projectName,
}: {
  entry: Entry;
  contactName?: string | null;
  projectName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<InvoiceStatus>((entry.status as InvoiceStatus) ?? "draft");

  async function changeStatus(next: InvoiceStatus) {
    setStatus(next);
    await fetch(`/api/finance/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    startTransition(() => router.refresh());
  }

  async function onDelete() {
    if (!confirm(`Delete "${entry.lineItem}"?`)) return;
    await fetch(`/api/finance/${entry.id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <tr className="hover:bg-stone-50">
      <td className="px-4 py-3 text-stone-500 text-sm">{fmtDate(entry.date)}</td>
      <td className="px-4 py-3">
        <div className="text-sm text-stone-900">{entry.lineItem}</div>
        {entry.notes && <div className="text-xs text-stone-500 line-clamp-1">{entry.notes}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        {contactName ? <Link href={`/contacts/${entry.contactId}`} className="hover:underline">{contactName}</Link> : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700">
        {projectName ? <Link href={`/projects/${entry.projectId}`} className="hover:underline">{projectName}</Link> : "—"}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-stone-900 tabular-nums">
        {fmtMoney(entry.amount)}
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value as InvoiceStatus)}
          disabled={pending}
          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]} disabled:opacity-50 capitalize`}
        >
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-white text-stone-900">{s}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-stone-500">
        {entry.status === "paid" ? fmtDate(entry.paymentDate) : ""}
      </td>
      <td className="px-2 py-3 text-right">
        <button onClick={onDelete} className="text-stone-400 hover:text-red-600 p-1 rounded" title="Delete">
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}
