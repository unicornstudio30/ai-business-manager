import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { PROJECT_STATUS_COLORS, type ProjectStatus } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (!project) notFound();

  const contacts = await db.select({ id: schema.contacts.id, name: schema.contacts.name }).from(schema.contacts);
  const linkedContact = project.contactId ? contacts.find((c) => c.id === project.contactId) : null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link href="/projects" className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" /> Back to projects
        </Link>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold text-stone-900">{project.name}</h1>
          {project.status && (
            <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium ${PROJECT_STATUS_COLORS[project.status as ProjectStatus] ?? "bg-stone-100 text-stone-700 border-stone-200"}`}>
              {project.status}
            </span>
          )}
        </div>
        {linkedContact && (
          <div className="mt-1 text-sm text-stone-500">
            Client: <Link href={`/contacts/${linkedContact.id}`} className="text-stone-700 hover:underline inline-flex items-center gap-1">
              {linkedContact.name} <ExternalLink className="size-3" />
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <ProjectEditForm project={project} contacts={contacts} />
      </div>
    </div>
  );
}
