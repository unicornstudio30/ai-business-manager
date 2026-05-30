// /networking/[id] — single networking contact detail.
// Shows the contact's profile, embedded Write Message wizard, and a feed of
// past messages drafted for them.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink, Mail, Phone, MapPin, Briefcase, Tag } from "lucide-react";
import { getNetworkingContact } from "@/lib/db/networking-contacts";
import { getMessagesForContact } from "@/lib/db/networking-messages";
import { WriteMessageWizard } from "@/components/networking/write-message-wizard";
import { MessageHistoryFeed } from "@/components/networking/message-history-feed";
import { fmtDate, fmtDateTime, parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function NetworkingContactPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, messages] = await Promise.all([
    getNetworkingContact(id),
    getMessagesForContact(id),
  ]);
  if (!contact) notFound();

  const notionUrl = contact.notionPageId
    ? `https://www.notion.so/${contact.notionPageId.replace(/-/g, "")}`
    : null;
  const interests = parseJson<string[]>(contact.interests, []);
  const tags = parseJson<string[]>(contact.tags, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/networking"
          className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="size-3" /> Back to networking
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
              {contact.name || "(no name)"}
            </h1>
            {(contact.role || contact.company) && (
              <p className="text-sm text-stone-600 mt-0.5">
                {[contact.role, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {notionUrl && (
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Open in Notion <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {contact.relationship && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-blue-100 text-blue-800 border border-blue-200">
              {contact.relationship}
            </span>
          )}
          {contact.stage && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-violet-100 text-violet-800 border border-violet-200">
              {contact.stage}
            </span>
          )}
          {contact.platform && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-stone-100 text-stone-700 border border-stone-200">
              {contact.platform}
            </span>
          )}
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-amber-50 text-amber-800 border border-amber-200"
            >
              <Tag className="size-2.5 mr-0.5" /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* Profile facts */}
      <section className="surface p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {contact.email && (
          <Fact icon={<Mail className="size-3.5" />} label="Email">
            <a href={`mailto:${contact.email}`} className="text-blue-700 hover:underline">
              {contact.email}
            </a>
          </Fact>
        )}
        {contact.phone && (
          <Fact icon={<Phone className="size-3.5" />} label="Phone">{contact.phone}</Fact>
        )}
        {contact.location && (
          <Fact icon={<MapPin className="size-3.5" />} label="Location">{contact.location}</Fact>
        )}
        {contact.profession && (
          <Fact icon={<Briefcase className="size-3.5" />} label="Profession">{contact.profession}</Fact>
        )}
        {contact.profileUrl && (
          <Fact icon={<ExternalLink className="size-3.5" />} label="Profile">
            <a
              href={contact.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline truncate inline-block max-w-[20rem]"
            >
              {contact.profileUrl}
            </a>
          </Fact>
        )}
        {contact.source && (
          <Fact icon={<Tag className="size-3.5" />} label="How we met">{contact.source}</Fact>
        )}
        {contact.lastContactAt && (
          <Fact icon={<Calendar className="size-3.5" />} label="Last contact">
            {fmtDate(contact.lastContactAt)}
          </Fact>
        )}
        {contact.nextFollowUpAt && (
          <Fact icon={<Calendar className="size-3.5" />} label="Next follow-up">
            {fmtDate(contact.nextFollowUpAt)}
          </Fact>
        )}
        {interests.length > 0 && (
          <div className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">Interests</div>
            <div className="flex flex-wrap gap-1.5">
              {interests.map((i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-stone-100 text-stone-700 border border-stone-200"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {contact.notes && (
          <div className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">Notes</div>
            <div className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">{contact.notes}</div>
          </div>
        )}
      </section>

      {/* Write Message wizard */}
      <WriteMessageWizard contact={contact} />

      {/* Message history feed */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-stone-900">
          Message history <span className="text-stone-400 font-normal">({messages.length})</span>
        </h2>
        <MessageHistoryFeed messages={messages} />
      </section>
    </div>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-stone-800">{children}</div>
    </div>
  );
}
