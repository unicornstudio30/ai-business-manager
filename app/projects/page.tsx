import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { PROJECT_STATUSES, PROJECT_STATUS_COLORS, type ProjectStatus } from "@/lib/projects";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { ProjectCard } from "@/components/projects/project-card";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, contacts] = await Promise.all([
    db.select().from(schema.projects).orderBy(desc(schema.projects.startDate)),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
  ]);

  const contactName = new Map(contacts.map((c) => [c.id, c.name]));
  const byStatus = new Map<ProjectStatus, typeof projects>();
  for (const s of PROJECT_STATUSES) byStatus.set(s, []);
  for (const p of projects) {
    const s = (p.status as ProjectStatus) ?? "Briefing";
    if (byStatus.has(s)) byStatus.get(s)!.push(p);
    else byStatus.get("Briefing")!.push(p);
  }

  const total = projects.length;
  const active = projects.filter((p) => p.status !== "Closed").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Projects</h1>
          <p className="text-sm text-stone-500 mt-1">
            Active 5–8 week AI builds. {active}/{total} active.
          </p>
        </div>
        <NewProjectForm contacts={contacts} />
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="text-sm text-stone-600 mb-3">No projects yet.</p>
          <p className="text-xs text-stone-500">
            When you close a deal, create a project here to track the 5–8 week build.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-fit">
            {PROJECT_STATUSES.map((status) => {
              const items = byStatus.get(status) ?? [];
              return (
                <div key={status} className="flex-shrink-0 w-72">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${PROJECT_STATUS_COLORS[status]}`}>
                      {status}
                    </span>
                    <span className="text-xs text-stone-400 tabular-nums">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-3 min-h-[200px]">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-xs text-stone-400">
                        empty
                      </div>
                    ) : (
                      items.map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={{
                            ...p,
                            contactName: p.contactId ? contactName.get(p.contactId) ?? null : null,
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
