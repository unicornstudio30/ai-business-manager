"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { SERVICE_LINES, PROJECT_STATUSES, type ServiceLine, type ProjectStatus } from "@/lib/projects";

type Contact = { id: string; name: string };

export function NewProjectForm({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get("name") as string,
      contactId: (fd.get("contactId") as string) || undefined,
      serviceLine: (fd.get("serviceLine") as ServiceLine) || undefined,
      status: (fd.get("status") as ProjectStatus) || "Briefing",
      scopeSummary: (fd.get("scopeSummary") as string) || undefined,
      startDate: (fd.get("startDate") as string) || undefined,
      dueDate: (fd.get("dueDate") as string) || undefined,
      price: fd.get("price") ? Number(fd.get("price")) : undefined,
      setupFee: fd.get("setupFee") ? Number(fd.get("setupFee")) : undefined,
      monthlyRetainer: fd.get("monthlyRetainer") ? Number(fd.get("monthlyRetainer")) : undefined,
      notes: (fd.get("notes") as string) || undefined,
    };
    const res = await fetch("/api/projects", {
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
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800"
      >
        <Plus className="size-4" /> New project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl mt-12">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">New project</h2>
          <button onClick={() => setOpen(false)} className="text-stone-500 hover:text-stone-900"><X className="size-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
          <Field label="Project name *" name="name" required />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Service line" name="serviceLine">
              <option value="">—</option>
              {SERVICE_LINES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            <SelectField label="Status" name="status" defaultValue="Briefing">
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
          </div>
          <SelectField label="Client (contact)" name="contactId">
            <option value="">— No contact linked —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <TextareaField label="Scope summary" name="scopeSummary" rows={2} placeholder="e.g., Build AI lead-scoring system + Slack notifications" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" name="startDate" type="date" />
            <Field label="Due date" name="dueDate" type="date" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Price (one-time, $)" name="price" type="number" />
            <Field label="Setup fee ($)" name="setupFee" type="number" />
            <Field label="Monthly retainer ($)" name="monthlyRetainer" type="number" />
          </div>
          <TextareaField label="Notes" name="notes" rows={2} />
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

function Field({ label, name, type = "text", required = false, ...rest }: any) {
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-600">
      {label}
      <input name={name} type={type} required={required} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" {...rest} />
    </label>
  );
}

function SelectField({ label, name, children, defaultValue }: any) {
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-600">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm bg-white">
        {children}
      </select>
    </label>
  );
}

function TextareaField({ label, name, rows = 3, placeholder }: any) {
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-600">
      {label}
      <textarea name={name} rows={rows} placeholder={placeholder} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
    </label>
  );
}
