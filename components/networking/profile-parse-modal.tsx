"use client";

// Modal for extracting profile data from a social-media post / profile.
// Three input modes — image upload, pasted text, or URL fetch — all converge
// on a structured ParsedProfile returned to the parent so it can pre-fill the
// wizard's Recent Post field (+ Role / Position / Company if missing).

import { useState, useTransition, useRef } from "react";
import { X, Upload, Type, Link as LinkIcon, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

type Tab = "image" | "text" | "url";

export type ParsedProfile = {
  name?: string;
  role?: string;
  position?: string;
  company?: string;
  location?: string;
  bio?: string;
  recentPost?: string;
  skills?: string[];
  interests?: string[];
  recentActivity?: string;
};

export function ProfileParseModal({
  open,
  onClose,
  onParsed,
  defaultUrl,
}: {
  open: boolean;
  onClose: () => void;
  onParsed: (parsed: ParsedProfile) => void;
  defaultUrl?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("image");
  const [text, setText] = useState("");
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProfile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function reset() {
    setText("");
    setUrl(defaultUrl ?? "");
    setImagePreview(null);
    setError(null);
    setParsed(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  function applyAndClose() {
    if (parsed) onParsed(parsed);
    close();
  }

  function handleFile(file: File) {
    if (file.size > 6 * 1024 * 1024) {
      setError("Image too large (max 6 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function submit() {
    setError(null);
    setParsed(null);
    let mode: Tab = tab;
    let payload = "";
    if (tab === "image") {
      if (!imagePreview) {
        setError("Upload a screenshot first");
        return;
      }
      payload = imagePreview;
    } else if (tab === "text") {
      if (text.trim().length < 30) {
        setError("Paste at least 30 characters of profile text");
        return;
      }
      payload = text.trim();
    } else {
      if (!url.trim()) {
        setError("Enter a URL");
        return;
      }
      payload = url.trim();
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/networking/profile-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        setParsed(data.parsed);
      } catch (e: any) {
        setError(e?.message ?? "Parse failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white rounded-2xl shadow-elevation-3 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            <h2 className="text-base font-semibold text-stone-900">Fetch from social profile</h2>
          </div>
          <button type="button" onClick={close} className="text-stone-400 hover:text-stone-900">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-stone-200 px-5">
          <TabButton active={tab === "image"} onClick={() => setTab("image")} icon={<Upload className="size-3.5" />}>
            Upload screenshot
          </TabButton>
          <TabButton active={tab === "text"} onClick={() => setTab("text")} icon={<Type className="size-3.5" />}>
            Paste profile text
          </TabButton>
          <TabButton active={tab === "url"} onClick={() => setTab("url")} icon={<LinkIcon className="size-3.5" />}>
            Fetch URL
          </TabButton>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {tab === "image" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-stone-600">
                Screenshot their LinkedIn / X / Facebook / Instagram profile or a single post. Vision model
                will OCR + extract name, role, company, location, and the visible recent post.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-violet-50 file:text-violet-800 file:text-xs file:font-medium hover:file:bg-violet-100 cursor-pointer"
              />
              {imagePreview && (
                <div className="rounded-lg border border-stone-200 p-2">
                  <img src={imagePreview} alt="Profile preview" className="max-h-64 mx-auto rounded" />
                </div>
              )}
            </div>
          )}

          {tab === "text" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-stone-600">
                Select all the text on their profile / latest post and paste it here. Useful when the platform
                blocks fetching (LinkedIn, X, IG, FB) and you don't have a screenshot.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder="Paste profile text here — bio, headline, recent post, company, location…"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
              />
              <div className="text-[10px] text-stone-400 text-right tabular-nums">{text.length} chars</div>
            </div>
          )}

          {tab === "url" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-stone-600">
                Works for personal blogs, About pages, GitHub. <strong>LinkedIn / X / Instagram / Facebook block server-side
                fetching</strong> — use Upload or Paste for those.
              </p>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… (e.g. their personal site or blog)"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
              />
            </div>
          )}

          {/* Action */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Parsing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Parse profile
                </>
              )}
            </button>
            {error && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700">
                <AlertCircle className="size-3.5" /> {error}
              </span>
            )}
          </div>

          {/* Parsed preview */}
          {parsed && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-700" />
                <div className="text-sm font-semibold text-emerald-900">Extracted</div>
              </div>
              <ExtractedFields parsed={parsed} />
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={applyAndClose}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Use this — fill wizard
                </button>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="text-xs text-stone-600 hover:text-stone-900"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-violet-600 text-violet-700"
          : "border-transparent text-stone-500 hover:text-stone-900"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ExtractedFields({ parsed }: { parsed: ParsedProfile }) {
  const rows: Array<[string, string | undefined]> = [
    ["Name", parsed.name],
    ["Position", parsed.position],
    ["Role", parsed.role],
    ["Company", parsed.company],
    ["Location", parsed.location],
    ["Bio", parsed.bio],
    ["Skills", parsed.skills?.join(", ")],
    ["Interests", parsed.interests?.join(", ")],
  ];
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        {rows
          .filter(([_, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="flex gap-1.5 min-w-0">
              <dt className="text-stone-500 flex-shrink-0">{label}:</dt>
              <dd className="text-stone-800 truncate">{value}</dd>
            </div>
          ))}
      </dl>
      {parsed.recentPost && (
        <div className="rounded-md border border-stone-200 bg-white p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">Recent post</div>
          <div className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {parsed.recentPost}
          </div>
        </div>
      )}
      {!parsed.recentPost && parsed.recentActivity && (
        <div className="rounded-md border border-stone-200 bg-white p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">Recent activity</div>
          <div className="text-xs text-stone-700">{parsed.recentActivity}</div>
        </div>
      )}
    </div>
  );
}
