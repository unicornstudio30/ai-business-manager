import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trophy, Sparkles, MessageCircle, AlertCircle } from "lucide-react";
import { buildPrepBrief } from "@/lib/prep-brief";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import { icpColor } from "@/lib/icp-scoring";

export const dynamic = "force-dynamic";

export default async function PrepBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brief = await buildPrepBrief(id);
  if (!brief) notFound();

  const m = brief.meeting;
  const c = brief.contact;

  const dt = m.scheduledAt ? (typeof m.scheduledAt === "string" ? new Date(m.scheduledAt) : m.scheduledAt) : null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link href="/meetings" className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" /> Back to meetings
        </Link>
        <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
          <Sparkles className="size-6 text-violet-500" /> Prep brief
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {m.eventName ?? "(meeting)"} · {fmtDateTime(dt)}
        </p>
      </div>

      {/* Contact + score */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">With</div>
            <div className="text-xl font-semibold text-stone-900">
              {c?.name ?? m.inviteeName ?? "(unknown)"}
            </div>
            {c?.email || m.inviteeEmail ? (
              <div className="text-sm text-stone-500 mt-0.5">{c?.email ?? m.inviteeEmail}</div>
            ) : null}
            <div className="flex items-center gap-2 mt-3">
              {c?.status && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[c.status as Stage] ?? "bg-stone-100 text-stone-800 border-stone-200"}`}>
                  {c.status}
                </span>
              )}
              {c?.platform && <span className="text-xs text-stone-500">{c.platform}</span>}
              {c?.country && <span className="text-xs text-stone-500">· {c.country}</span>}
            </div>
            {c?.contactUrl && (
              <a href={c.contactUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline mt-2">
                Open profile <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          {brief.icpScore !== null && (
            <div className="text-right">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">ICP fit</div>
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg border text-2xl font-semibold tabular-nums ${icpColor(brief.icpScore)}`}>
                {brief.icpScore}
              </div>
            </div>
          )}
        </div>
        {c?.remarks && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Notion remarks</div>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{c.remarks}</p>
          </div>
        )}
      </section>

      {/* Recent activities */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
          <MessageCircle className="size-4 text-stone-400" /> Recent touchpoints
          <span className="text-stone-400 font-normal">({brief.recentActivities.length})</span>
        </h2>
        {brief.recentActivities.length === 0 ? (
          <div className="text-sm text-stone-500">No prior activities logged.</div>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100">
            {brief.recentActivities.slice(0, 8).map((a) => (
              <li key={a.id} className="py-2 flex items-start gap-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide flex-shrink-0 w-32">
                  {a.type.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-stone-400 mb-0.5">{fmtDateTime(a.createdAt)}</div>
                  <p className="text-sm text-stone-700 line-clamp-2">{a.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Audits if any */}
      {brief.audits.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-stone-900 mb-3">Site audits</h2>
          <ul className="flex flex-col gap-2">
            {brief.audits.map((a: any) => (
              <li key={a.id} className="text-sm">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">{a.url}</a>
                {a.summary && <p className="text-xs text-stone-600 mt-0.5">{a.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Discovery questions for this stage */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          Discovery questions for stage: {c?.status ?? "First call"}
        </h2>
        <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-stone-700">
          {brief.questions.map((q, i) => <li key={i}>{q}</li>)}
        </ol>
      </section>

      {/* Objection bank */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
          <AlertCircle className="size-4 text-red-500" /> Likely objections + ACA responses
        </h2>
        <ul className="flex flex-col gap-3">
          {brief.objectionBank.map((o, i) => (
            <li key={i} className="rounded-lg bg-stone-50 p-3">
              <div className="text-sm font-medium text-stone-900 mb-1">"{o.objection}"</div>
              <p className="text-sm text-stone-700">{o.response}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 30s pitch */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
        <h2 className="text-sm font-semibold text-violet-900 mb-3">Your 30-second pitch (if asked)</h2>
        <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans">{brief.pitch}</pre>
      </section>

      <div className="text-xs text-stone-400 text-center">
        Brief generated {fmtDateTime(brief.generatedAt)} · refresh page to regenerate
      </div>
    </div>
  );
}
