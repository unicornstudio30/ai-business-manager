"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Check } from "lucide-react";

const TYPES = [
  { id: "dm_sent", label: "DM sent" },
  { id: "comment_drafted", label: "Comment" },
  { id: "email_drafted", label: "Email" },
  { id: "follow_up_sent", label: "Follow-up" },
  { id: "audit_run", label: "Audit" },
  { id: "post_observed", label: "Post observed" },
  { id: "note", label: "Note" },
];

type ContactOption = { id: string; name: string };

// Floating "+ Log" button visible on every page. Opens a dialog to record one
// activity (paste from Taplio / Tweethunter / wherever). 5-second per-comment
// workflow when you're outside the contact page.
export function QuickLog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [search, setSearch] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [type, setType] = useState<string>("dm_sent");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Load contact list once on open
  useEffect(() => {
    if (!open || contacts.length > 0) return;
    fetch("/api/contacts?limit=500")
      .then((r) => r.json())
      .then((raw: unknown) => {
        const arr: any[] = Array.isArray(raw) ? raw : ((raw as any)?.items ?? []);
        setContacts(arr.map((c) => ({ id: c.id, name: c.name || "(no name)" })));
      })
      .catch(() => {});
  }, [open, contacts.length]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Filter contacts by search
  const filtered = search.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : contacts.slice(0, 8);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId || null,
          type,
          content: content.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setContent("");
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
        router.refresh();
      }, 800);
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Floating button — sits above the MobileTabBar (~56px tall) on mobile,
          back to the corner on desktop. */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 sm:right-6 bottom-20 lg:bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-4 py-3 text-sm font-medium shadow-elevation-3 hover:shadow-elevation-4 hover:-translate-y-0.5 transition-all duration-200 ease-material"
        style={{ touchAction: "manipulation" }}
        title="Quick log activity (Taplio / Tweethunter / manual)"
      >
        <Plus className="size-4" />
        Log
      </button>

      {/* Dialog */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white shadow-elevation-5 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Quick log</div>
                <h2 className="text-lg font-semibold text-stone-900">Record an activity</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Type chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    type === t.id
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contact picker */}
            <div className="mb-4">
              <label className="text-xs font-medium text-stone-600 mb-1 block">Contact (optional)</label>
              {contactId ? (
                <div className="flex items-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm">
                  <span className="flex-1">{contacts.find((c) => c.id === contactId)?.name}</span>
                  <button onClick={() => setContactId("")} className="text-stone-400 hover:text-stone-900">
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contact by name…"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                  />
                  {search.trim() && filtered.length > 0 && (
                    <div className="mt-1 rounded-lg border border-stone-200 bg-white shadow-elevation-2 max-h-48 overflow-y-auto">
                      {filtered.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setContactId(c.id);
                            setSearch("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-stone-100"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Content */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste comment / DM / note…"
              rows={5}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-y"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-stone-400">
                {content.length > 0 && `${content.length} chars`}
              </span>
              <button
                onClick={save}
                disabled={saving || !content.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : saved ? (
                  <>
                    <Check className="size-4" /> Saved
                  </>
                ) : (
                  "Save activity"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
