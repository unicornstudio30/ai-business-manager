"use client";

import Link from "next/link";
import { fmtDate, daysAgo, parseJson } from "@/lib/utils";
import { SERVICE_LINE_COLORS, type ServiceLine } from "@/lib/projects";
import { Calendar, AlertTriangle } from "lucide-react";

type Project = {
  id: string;
  name: string;
  contactId: string | null;
  contactName?: string | null;
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
};

export function ProjectCard({ project }: { project: Project }) {
  const dueDate = project.dueDate ? (typeof project.dueDate === "string" ? new Date(project.dueDate) : project.dueDate) : null;
  const daysToDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
  const atRisk = daysToDue !== null && daysToDue <= 7 && project.status !== "Delivered" && project.status !== "Closed";

  const deliverables = parseJson<string[]>(project.deliverables, []);
  const total = (project.price ?? 0) + (project.setupFee ?? 0);

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`block rounded-xl border bg-white p-4 hover:shadow-md transition-shadow ${atRisk ? "border-red-300" : "border-stone-200"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-stone-900 leading-tight">{project.name}</h3>
        {atRisk && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-xs text-red-700 border border-red-200">
            <AlertTriangle className="size-3" />
            {daysToDue === 0 ? "Today" : daysToDue! < 0 ? `${Math.abs(daysToDue!)}d late` : `${daysToDue}d`}
          </span>
        )}
      </div>
      {project.serviceLine && (
        <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-medium mb-2 ${SERVICE_LINE_COLORS[project.serviceLine as ServiceLine] ?? "bg-stone-100 text-stone-700"}`}>
          {project.serviceLine}
        </span>
      )}
      {project.scopeSummary && (
        <p className="text-xs text-stone-600 mb-2 line-clamp-2">{project.scopeSummary}</p>
      )}
      {project.contactName && (
        <p className="text-xs text-stone-500 mb-2">👤 {project.contactName}</p>
      )}
      <div className="flex items-center justify-between text-xs text-stone-500 mt-2 pt-2 border-t border-stone-100">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" /> {fmtDate(dueDate)}
        </span>
        {total > 0 && <span className="font-semibold text-stone-700">${total.toLocaleString()}</span>}
      </div>
      {deliverables.length > 0 && (
        <div className="mt-2 text-xs text-stone-500">
          {deliverables.length} deliverable{deliverables.length === 1 ? "" : "s"}
        </div>
      )}
    </Link>
  );
}
