import Link from "next/link";
import { notFound } from "next/navigation";
import { getContactById, getContactActivities } from "@/lib/db/queries";
import { StageStepper } from "@/components/contacts/stage-stepper";
import { SequenceWidget } from "@/components/contacts/sequence-widget";
import { ActivitiesFeed } from "@/components/contacts/activities-feed";
import { StageSuggestionsBanner } from "@/components/contacts/stage-suggestions-banner";
import { computeStageSuggestions } from "@/lib/stage-suggestions";
import { fmtDate, daysAgo, parseJson } from "@/lib/utils";
import { ExternalLink, Mail, MapPin, ArrowLeft, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) notFound();
  const activities = await getContactActivities(id);

  const positions = parseJson<string[]>(contact.position, []);
  const professions = parseJson<string[]>(contact.profession, []);
  const categories = parseJson<string[]>(contact.category, []);
  const followUpAge = daysAgo(contact.followUpDate);
  const stageSuggestions = computeStageSuggestions(contact, activities);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/contacts" className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" /> Back to contacts
        </Link>
        <h1 className="text-2xl font-semibold text-stone-900">{contact.name || "(no name)"}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-stone-500">
          {contact.country && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {contact.country}
            </span>
          )}
          {contact.platform && <span>{contact.platform}</span>}
          {categories.length > 0 && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs">{categories.join(", ")}</span>
          )}
        </div>
      </div>

      <StageSuggestionsBanner
        currentStage={contact.status}
        suggestions={stageSuggestions}
        notionPageId={contact.notionPageId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
        {/* Left: profile + sequence */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 flex flex-col gap-5">
            <StageStepper status={contact.status} />

            <div className="border-t border-stone-100 pt-4 flex flex-col gap-3 text-sm">
              {contact.email && (
                <div className="flex items-start gap-3">
                  <Mail className="size-4 text-stone-400 mt-0.5" />
                  <a href={`mailto:${contact.email}`} className="text-stone-700 hover:underline break-all">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.contactUrl && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="size-4 text-stone-400 mt-0.5" />
                  <a href={contact.contactUrl} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline break-all">
                    {contact.contactUrl}
                  </a>
                </div>
              )}
              {contact.websiteUrl && (
                <div className="flex items-start gap-3">
                  <Globe className="size-4 text-stone-400 mt-0.5" />
                  <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline break-all">
                    {contact.websiteUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 pt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-medium text-stone-500 uppercase tracking-wide mb-1">Status date</div>
                <div className="text-stone-800">{fmtDate(contact.statusDate)}</div>
              </div>
              <div>
                <div className="font-medium text-stone-500 uppercase tracking-wide mb-1">Follow-up</div>
                <div className="text-stone-800">
                  {fmtDate(contact.followUpDate)}
                  {followUpAge !== null && followUpAge > 0 && (
                    <span className="ml-1 text-red-600">({followUpAge}d overdue)</span>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium text-stone-500 uppercase tracking-wide mb-1">Saved</div>
                <div className="text-stone-800">{fmtDate(contact.savedDate)}</div>
              </div>
              <div>
                <div className="font-medium text-stone-500 uppercase tracking-wide mb-1">Engage touch</div>
                <div className="text-stone-800">{contact.engageTouch ?? "—"}</div>
              </div>
            </div>

            {(positions.length > 0 || professions.length > 0) && (
              <div className="border-t border-stone-100 pt-4 flex flex-col gap-2">
                {positions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide mr-1">Role:</span>
                    {positions.map((p) => (
                      <span key={p} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                {professions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide mr-1">Field:</span>
                    {professions.map((p) => (
                      <span key={p} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {contact.remarks && (
              <div className="border-t border-stone-100 pt-4">
                <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Remarks</div>
                <div className="text-sm text-stone-700 whitespace-pre-wrap">{contact.remarks}</div>
              </div>
            )}
          </div>

          <SequenceWidget
            platform={contact.platform}
            engageTouch={contact.engageTouch}
            lastTouchAt={contact.lastTouchAt}
          />

          {contact.notionPageId && (
            <div className="text-xs text-stone-400 px-2">
              Synced from Notion · last edit {fmtDate(contact.notionLastEditedAt)}
            </div>
          )}
        </div>

        {/* Right: Activities feed */}
        <div>
          <ActivitiesFeed activities={activities} />
        </div>
      </div>
    </div>
  );
}
