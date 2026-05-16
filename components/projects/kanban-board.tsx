"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { PROJECT_STATUSES, PROJECT_STATUS_COLORS, type ProjectStatus } from "@/lib/projects";
import { ProjectCard } from "./project-card";

type Project = Parameters<typeof ProjectCard>[0]["project"];

type Props = {
  projects: Project[];
};

export function KanbanBoard({ projects: initial }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a 5px drag before activation so clicks (open card) still work
      activationConstraint: { distance: 5 },
    })
  );

  const byStatus = new Map<ProjectStatus, Project[]>();
  for (const s of PROJECT_STATUSES) byStatus.set(s, []);
  for (const p of projects) {
    const s = (p.status as ProjectStatus) ?? "Briefing";
    if (byStatus.has(s)) byStatus.get(s)!.push(p);
    else byStatus.get("Briefing")!.push(p);
  }

  const activeProject = projects.find((p) => p.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const projectId = String(e.active.id);
    const newStatus = String(e.over.id) as ProjectStatus;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );

    // Persist
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      // Roll back on failure
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p))
      );
      console.error("Failed to update project status:", err);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-fit">
          {PROJECT_STATUSES.map((status) => {
            const items = byStatus.get(status) ?? [];
            return (
              <Column key={status} status={status} count={items.length}>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-xs text-stone-400">
                    drop here
                  </div>
                ) : (
                  items.map((p) => <DraggableCard key={p.id} project={p} />)
                )}
              </Column>
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {activeProject ? (
          <div className="opacity-90 rotate-2 cursor-grabbing">
            <ProjectCard project={activeProject} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  count,
  children,
}: {
  status: ProjectStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl p-2 transition-colors ${
        isOver ? "bg-violet-50/60" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${PROJECT_STATUS_COLORS[status]}`}
        >
          {status}
        </span>
        <span className="text-xs text-stone-400 tabular-nums">{count}</span>
      </div>
      <div className="flex flex-col gap-3 min-h-[120px]">{children}</div>
    </div>
  );
}

function DraggableCard({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <ProjectCard project={project} />
    </div>
  );
}
