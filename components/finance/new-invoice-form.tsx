"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/finance";

type Contact = { id: string; name: string };
type Project = { id: string; name: string };

export function NewInvoiceForm({ contacts, projects }: { contacts: Contact[]; projects: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      date: fd.get("date") as string,
      contactId: (fd.get("contactId") as string) || null,
      projectId: (fd.get("projectId") as string) || null,
      lineItem: fd.get("lineItem") as string,
      amount: Number(fd.get("amount")),
      status: fd.get("status") as InvoiceStatus,
      paymentDate: (fd.get("paymentDate") as string) || null,
      notes: (fd.get("notes") as string) || null,
    };
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(JSON.stringify(j.error) || "Failed to create");
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800">
        <Plus className="size-4" /> New invoice
      </button>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl mt-12">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">New invoice</h2>
          <button onClick={() => setOpen(false)} className="text-stone-500 hover:text-stone-900"><X className="size-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Line item *
            <input name="lineItem" required placeholder="e.g., Setup fee — AI Lead Scoring Build" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs text-stone-600">
              Amount ($) *
              <input name="amount" type="number" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-600">
              Date *
              <input name="date" type="date" required defaultValue={today} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs text-stone-600">
              Status
              <select name="status" defaultValue="draft" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm bg-white">
                {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-600">
              Payment date (if paid)
              <input name="paymentDate" type="date" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs text-stone-600">
              Client (contact)
              <select name="contactId" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm bg-white">
                <option value="">—</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-600">
              Project
              <select name="projectId" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm bg-white">
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Notes
            <textarea name="notes" rows={2} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">{pending ? "Saving…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
