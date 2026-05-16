import { db, schema } from "@/lib/db/client";
import { desc } from "drizzle-orm";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { KanbanBoard } from "@/components/projects/kanban-board";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, contacts] = await Promise.all([
    db.select().from(schema.projects).orderBy(desc(schema.projects.startDate)),
    db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts),
  ]);

  const contactName = new Map(contacts.map((c) => [c.id, c.name]));
  const total = projects.length;
  const active = projects.filter((p) => p.status !== "Closed").length;

  // Hydrate contact name onto each project so the client kanban doesn't
  // need its own contacts query
  const enriched = projects.map((p) => ({
    ...p,
    contactName: p.contactId ? contactName.get(p.contactId) ?? null : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Projects</h1>
          <p className="text-sm text-stone-500 mt-1">
            Active 5–8 week AI builds. {active}/{total} active. <span className="text-stone-400">Drag cards between columns to update status.</span>
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
        <KanbanBoard projects={enriched} />
      )}
    </div>
  );
}
