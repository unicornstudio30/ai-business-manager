"use client";

// 7-step Write Message wizard with framework selection.
// Steps:
//   1. Recipient (pre-filled from page)
//   2. Purpose / objective
//   3. Context (≤3 chips + free-text detail, ≤12000 char)
//   4. Call to action (≤3 chips)
//   5. Tone + Framework (single each)
//   6. Channel + Language
//   7. Topic → Generate
// Live strength score 0-100 updates on every change. Generate calls
// /api/networking/messages/generate which returns 3 variants and persists them.

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, ChevronLeft, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import type { NetworkingContact } from "@/lib/db/schema";

const STEPS = ["Recipient", "Purpose", "Context", "Call to action", "Tone & framework", "Channel & language", "Topic"];

const CONTEXT_CHIPS = [
  "Mutual interest",
  "Recent post / news",
  "Shared connection",
  "Past conversation",
  "Specific work of theirs",
  "Their challenge / pain",
  "An opportunity",
  "Community / event",
  "Personal milestone",
];

const CTA_CHIPS = [
  "Set up a call",
  "Meet in person",
  "Get advice / feedback",
  "Make an intro / reference",
  "Schedule a date / event",
  "Other",
];

const TONES = ["Professional", "Friendly", "Direct", "Fun", "Romantic", "Casual"];

const FRAMEWORKS = [
  { id: "ACA", label: "ACA — Acknowledge → Compliment → Ask", hint: "Warm, personal openers" },
  { id: "AIDA", label: "AIDA — Attention → Interest → Desire → Action", hint: "Classic sales arc" },
  { id: "PAS", label: "PAS — Problem → Agitate → Solve", hint: "Pain-led pitch" },
  { id: "FAB", label: "FAB — Features → Advantages → Benefits", hint: "Offer-led" },
  { id: "BAB", label: "BAB — Before → After → Bridge", hint: "Transformation arc" },
  { id: "QUEST", label: "QUEST — Qualify → Understand → Educate → Stimulate → Transition", hint: "Discovery / consultative" },
  { id: "Casual", label: "Casual — no framework", hint: "Conversational, natural" },
];

const CHANNELS = ["DM / Inbox", "Email", "WhatsApp", "Other"];
const LANGUAGES = ["English", "Bengali"];

type State = {
  purpose: string;
  contextChips: string[];
  contextDetail: string;
  ctaChips: string[];
  tone: string;
  framework: string;
  channel: string;
  language: string;
  topic: string;
};

type Generated = { id: string; short: string; standard: string; detailed: string };

function strengthScore(s: State, recipientName: string, relationship: string | null | undefined): number {
  let score = 0;
  if (recipientName) score += 10;
  if (relationship) score += 10;
  if (s.purpose) score += 15;
  if (s.contextChips.length > 0) score += 5;
  if (s.contextChips.length >= 2) score += 5;
  if (s.contextChips.length >= 3) score += 5;
  if (s.contextDetail.length > 30) score += 10;
  if (s.ctaChips.length > 0) score += 10;
  if (s.tone) score += 10;
  if (s.framework) score += 5;
  if (s.channel) score += 5;
  if (s.language) score += 5;
  if (s.topic.trim().length > 3) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function WriteMessageWizard({ contact }: { contact: NetworkingContact }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<State>({
    purpose: "",
    contextChips: [],
    contextDetail: "",
    ctaChips: [],
    tone: "Friendly",
    framework: "ACA",
    channel: "DM / Inbox",
    language: "English",
    topic: "",
  });
  const [pending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [error, setError] = useState<string | null>(null);

  const score = strengthScore(state, contact.name, contact.relationship);

  function toggleChip(field: "contextChips" | "ctaChips", chip: string) {
    setState((s) => {
      const has = s[field].includes(chip);
      if (has) return { ...s, [field]: s[field].filter((x) => x !== chip) };
      if (s[field].length >= 3) return s;
      return { ...s, [field]: [...s[field], chip] };
    });
  }

  function generate() {
    setError(null);
    setGenerated(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/networking/messages/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: contact.id, ...state }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        const msg = data.message;
        setGenerated({
          id: msg.id,
          short: msg.generatedShort,
          standard: msg.generatedStandard,
          detailed: msg.generatedDetailed,
        });
        router.refresh(); // refresh history feed
      } catch (e: any) {
        setError(e?.message ?? "Generation failed");
      }
    });
  }

  function resetWizard() {
    setGenerated(null);
    setError(null);
    setStep(0);
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-white p-5 shadow-elevation-1">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-violet-600" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Write Message
            </div>
            <div className="text-sm text-stone-700">
              Generate a personalized message to <strong>{contact.name}</strong> in 7 steps.
            </div>
          </div>
        </div>
        <StrengthGauge score={score} />
      </div>

      {!generated && (
        <>
          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {STEPS.map((label, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-violet-500" : i === step ? "bg-violet-300" : "bg-stone-200"
                }`}
                title={`Step ${i + 1}: ${label}`}
              />
            ))}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-stone-500 mb-3">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </div>

          {/* Step content */}
          <div className="min-h-[180px]">
            {step === 0 && <StepRecipient contact={contact} />}
            {step === 1 && (
              <StepText
                label="Why are you reaching out?"
                hint="One sentence is fine. Example: reconnect after a long gap; explore a collaboration; ask for advice on X."
                value={state.purpose}
                onChange={(v) => setState({ ...state, purpose: v })}
              />
            )}
            {step === 2 && (
              <StepContext
                chips={state.contextChips}
                detail={state.contextDetail}
                onToggle={(c) => toggleChip("contextChips", c)}
                onDetail={(v) => setState({ ...state, contextDetail: v.slice(0, 12000) })}
              />
            )}
            {step === 3 && (
              <StepChipMulti
                label="What do you want them to do? (pick up to 3)"
                options={CTA_CHIPS}
                selected={state.ctaChips}
                onToggle={(c) => toggleChip("ctaChips", c)}
              />
            )}
            {step === 4 && (
              <StepToneFramework
                tone={state.tone}
                framework={state.framework}
                onTone={(v) => setState({ ...state, tone: v })}
                onFramework={(v) => setState({ ...state, framework: v })}
              />
            )}
            {step === 5 && (
              <StepChannelLanguage
                channel={state.channel}
                language={state.language}
                onChannel={(v) => setState({ ...state, channel: v })}
                onLanguage={(v) => setState({ ...state, language: v })}
              />
            )}
            {step === 6 && (
              <StepText
                label="Topic / subject of the message"
                hint={`The one-liner you want this message to be about. Example: "thoughts on the AI agents thread you posted last week"`}
                value={state.topic}
                onChange={(v) => setState({ ...state, topic: v })}
              />
            )}
          </div>

          {error && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-red-700">
              <AlertCircle className="size-3.5" /> {error}
            </div>
          )}

          {/* Nav */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Next <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={generate}
                disabled={pending || !state.topic.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Build messages
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}

      {generated && (
        <>
          <div className="text-xs text-stone-500 mb-3">
            Three variants generated · saved to message history below
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ResultCard label="Short" text={generated.short} />
            <ResultCard label="Standard" text={generated.standard} />
            <ResultCard label="Detailed" text={generated.detailed} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={resetWizard}
              className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Write another
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepRecipient({ contact }: { contact: NetworkingContact }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-xs text-stone-500 mb-2">Sending to</div>
      <div className="text-base font-semibold text-stone-900">{contact.name}</div>
      <div className="text-xs text-stone-600 mt-1">
        {[contact.role, contact.company, contact.location].filter(Boolean).join(" · ") || "—"}
      </div>
      {contact.relationship && (
        <div className="mt-2 text-[11px] text-stone-500">
          Relationship: <strong>{contact.relationship}</strong>
        </div>
      )}
      {!contact.relationship && (
        <div className="mt-2 text-[11px] text-amber-700">
          ⚠ No relationship set in Notion — message may feel generic. Update the PRM row to improve.
        </div>
      )}
    </div>
  );
}

function StepText({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-stone-800">{label}</label>
      {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
      />
    </div>
  );
}

function StepContext({
  chips,
  detail,
  onToggle,
  onDetail,
}: {
  chips: string[];
  detail: string;
  onToggle: (chip: string) => void;
  onDetail: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-sm font-medium text-stone-800 mb-1">Background / context</div>
        <p className="text-[11px] text-stone-500 mb-2">Pick up to 3 that apply. {chips.length}/3 selected.</p>
        <div className="flex flex-wrap gap-1.5">
          {CONTEXT_CHIPS.map((c) => {
            const isOn = chips.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => onToggle(c)}
                disabled={!isOn && chips.length >= 3}
                className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                  isOn
                    ? "bg-violet-100 text-violet-800 border-violet-300"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-stone-800">Detail (optional)</label>
        <p className="text-[11px] text-stone-500 mb-1">
          The specific thing you want them to read. Up to 12,000 characters.
        </p>
        <textarea
          value={detail}
          onChange={(e) => onDetail(e.target.value)}
          rows={4}
          maxLength={12000}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
        />
        <div className="text-[10px] text-stone-400 text-right mt-1 tabular-nums">{detail.length} / 12000</div>
      </div>
    </div>
  );
}

function StepChipMulti({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (chip: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-stone-800 mb-1">{label}</div>
      <p className="text-[11px] text-stone-500 mb-2">{selected.length}/3 selected.</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const isOn = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              disabled={!isOn && selected.length >= 3}
              className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                isOn
                  ? "bg-violet-100 text-violet-800 border-violet-300"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepToneFramework({
  tone,
  framework,
  onTone,
  onFramework,
}: {
  tone: string;
  framework: string;
  onTone: (v: string) => void;
  onFramework: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-medium text-stone-800 mb-2">Tone</div>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTone(t)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                tone === t
                  ? "bg-violet-100 text-violet-800 border-violet-300"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-stone-800 mb-2">Message framework</div>
        <p className="text-[11px] text-stone-500 mb-2">
          Structural recipe the message should follow.
        </p>
        <div className="flex flex-col gap-1.5">
          {FRAMEWORKS.map((f) => {
            const isOn = framework === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFramework(f.id)}
                className={`text-left text-[11px] px-3 py-2 rounded-md border transition-all ${
                  isOn
                    ? "bg-violet-100 text-violet-900 border-violet-300"
                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="font-medium">{f.label}</div>
                <div className="text-stone-500 text-[10px] mt-0.5">{f.hint}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepChannelLanguage({
  channel,
  language,
  onChannel,
  onLanguage,
}: {
  channel: string;
  language: string;
  onChannel: (v: string) => void;
  onLanguage: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-medium text-stone-800 mb-2">Channel</div>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChannel(c)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                channel === c
                  ? "bg-violet-100 text-violet-800 border-violet-300"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-stone-800 mb-2">Output language</div>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLanguage(l)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                language === l
                  ? "bg-violet-100 text-violet-800 border-violet-300"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrengthGauge({ score }: { score: number }) {
  const tone = score >= 70 ? "emerald" : score >= 40 ? "amber" : "stone";
  const color = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-stone-400";
  const label = score >= 70 ? "Strong" : score >= 40 ? "Decent" : "Thin";
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
        <span>Message strength</span>
        <span className="tabular-nums">{score}/100 · {label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`${color} h-full transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="surface p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900"
        >
          {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
  );
}
