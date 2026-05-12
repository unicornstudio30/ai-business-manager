"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, AlertCircle, Trash2 } from "lucide-react";
import { PROJECT_STATUSES, SERVICE_LINES, type ProjectStatus, type ServiceLine } from "@/lib/projects";

type Project = {
  id: string;
  name: string;
  contactId: string | null;
  serviceLine: string | null;
  scopeSummary: string | null;
  startDate: Date | string | null;
  dueDate: Date | string | null;
  status: string | null;
  price: number | null;
  setupFee: number | null;
  monthlyRetainer: number | null;
  deliverables: string | null;
  blockers: string | null;
  notes: string | null;
};

type Contact = { id: string; name: string };

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function ProjectEditForm({ project, contacts }: { project: Project; contacts: Contact[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);

    const fd = new FormData(e.currentTarget);
    const deliverables = (fd.get("deliverables") as string)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: any = {
      name: fd.get("name") as string,
      contactId: (fd.get("contactId") as string) || null,
      serviceLine: (fd.get("serviceLine") as string) || null,
      status: fd.get("status") as ProjectStatus,
      scopeSummary: (fd.get("scopeSummary") as string) || null,
      startDate: (fd.get("startDate") as string) || null,
      dueDate: (fd.get("dueDate") as string) || null,
      price: fd.get("price") ? Number(fd.get("price")) : null,
      setupFee: fd.get("setupFee") ? Number(fd.get("setupFee")) : null,
      monthlyRetainer: fd.get("monthlyRetainer") ? Number(fd.get("monthlyRetainer")) : null,
      deliverables,
      blockers: (fd.get("blockers") as string) || null,
      notes: (fd.get("notes") as string) || null,
    };

    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(JSON.stringify(j.error) || "Save failed");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    startTransition(() => router.refresh());
  }

  async function onDelete() {
    if (!confirm(`Delete project "${project.name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  const deliverablesText = (() => {
    try { return (JSON.parse(project.deliverables || "[]") as string[]).join("\n"); }
    catch { return ""; }
  })();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Project name *" name="name" defaultValue={project.name} required />
        <SelectField label="Status *" name="status" defaultValue={project.status || "Briefing"}>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectField>
        <SelectField label="Service line" name="serviceLine" defaultValue={project.serviceLine || ""}>
          <option value="">—</option>
          {SERVICE_LINES.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectField>
        <SelectField label="Client (contact)" name="contactId" defaultValue={project.contactId || ""}>
          <option value="">— No contact linked —</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
      </div>

      <TextareaField label="Scope summary" name="scopeSummary" defaultValue={project.scopeSummary || ""} rows={3} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" name="startDate" type="date" defaultValue={toDateStr(project.startDate)} />
        <Field label="Due date" name="dueDate" type="date" defaultValue={toDateStr(project.dueDate)} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Price (one-time, $)" name="price" type="number" defaultValue={project.price ?? ""} />
        <Field label="Setup fee ($)" name="setupFee" type="number" defaultValue={project.setupFee ?? ""} />
        <Field label="Monthly retainer ($)" name="monthlyRetainer" type="number" defaultValue={project.monthlyRetainer ?? ""} />
      </div>

      <TextareaField label="Deliverables (one per line)" name="deliverables" defaultValue={deliverablesText} rows={5} placeholder="e.g.,&#10;Lead-scoring engine&#10;Slack notification webhook&#10;Daily reports dashboard" />
      <TextareaField label="Blockers" name="blockers" defaultValue={project.blockers || ""} rows={2} />
      <TextareaField label="Notes" name="notes" defaultValue={project.notes || ""} rows={3} />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          <AlertCircle className="size-4" />{error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-stone-200 pt-4">
        <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md px-3 py-1.5">
          <Trash2 className="size-4" /> Delete
        </button>
        <button type="submit" disabled={saving || pending} className="flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          {saving ? "Saving…" : saved ? (<><Check className="size-4 text-green-300" /> Saved</>) : (<><Save className="size-4" /> Save</>)}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, type = "text", required = false, defaultValue, placeholder }: any) {
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-600">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
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

function TextareaField({ label, name, rows = 3, defaultValue, placeholder }: any) {
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-600">
      {label}
      <textarea name={name} rows={rows} defaultValue={defaultValue} placeholder={placeholder} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm font-sans" />
    </label>
  );
}
