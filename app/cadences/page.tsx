import { db, schema } from "@/lib/db/client";
import { computeCadence, dueToday, dueSoon } from "@/lib/cadences";
import { CadenceRow } from "@/components/cadences/cadence-row";

export const dynamic = "force-dynamic";

export default async function CadencesPage() {
  const contacts = await db.select().from(schema.contacts);
  const items = contacts
    .map((c) => computeCadence(c))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const today = dueToday(items);
  const soon = dueSoon(items, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Cadences</h1>
        <p className="text-sm text-stone-500 mt-1">
          Contacts due for their next DM-sequence step. 7-step LinkedIn / 8-step Facebook templates.
          Computed from each contact's <code className="px-1 bg-stone-100 rounded">engageTouch</code> + <code className="px-1 bg-stone-100 rounded">lastTouchAt</code>.
        </p>
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-900">
            Due today <span className="text-stone-400 font-normal">({today.length})</span>
          </h2>
          {today.length > 0 && (
            <p className="text-xs text-stone-500">Most overdue first</p>
          )}
        </div>
        {today.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            Nothing due today. Nice.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {today.map((item) => (
              <CadenceRow
                key={item.contact.id}
                id={item.contact.id}
                name={item.contact.name}
                status={item.contact.status}
                notionPageId={item.contact.notionPageId}
                contactUrl={item.contact.contactUrl}
                track={item.track}
                currentStep={item.currentStep}
                nextStepNumber={item.nextStep!.step}
                nextStepBrief={item.nextStep!.brief}
                nextStepChannel={item.nextStep!.channel}
                daysUntilDue={item.daysUntilDue ?? 0}
                dueDate={item.dueDate}
                isFinal={item.isFinal}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-900">
            Due in next 3 days <span className="text-stone-400 font-normal">({soon.length})</span>
          </h2>
        </div>
        {soon.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            Nothing queued for the next 3 days.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {soon.map((item) => (
              <CadenceRow
                key={item.contact.id}
                id={item.contact.id}
                name={item.contact.name}
                status={item.contact.status}
                notionPageId={item.contact.notionPageId}
                contactUrl={item.contact.contactUrl}
                track={item.track}
                currentStep={item.currentStep}
                nextStepNumber={item.nextStep!.step}
                nextStepBrief={item.nextStep!.brief}
                nextStepChannel={item.nextStep!.channel}
                daysUntilDue={item.daysUntilDue ?? 0}
                dueDate={item.dueDate}
                isFinal={item.isFinal}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
