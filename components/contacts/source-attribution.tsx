"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Check } from "lucide-react";

type ContentOption = { id: string; title: string };

type Props = {
  contactId: string;
  currentSourceId: string | null;
};

export function SourceAttribution({ contactId, currentSourceId }: Props) {
  const router = useRouter();
  const [options, setOptions] = useState<ContentOption[]>([]);
  const [selected, setSelected] = useState<string>(currentSourceId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/content?limit=200")
      .then((r) => r.json())
      .then((raw: unknown) => {
        const items: any[] = Array.isArray(raw) ? raw : ((raw as any)?.items ?? []);
        setOptions(items.map((c) => ({ id: c.id, title: c.title || "(untitled)" })));
      })
      .catch(() => {});
  }, []);

  async function save(newVal: string) {
    setSelected(newVal);
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/contacts/${contactId}/source`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: newVal || null }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <Megaphone className="size-3 text-stone-400" />
      <span className="text-stone-500">Source:</span>
      <select
        value={selected}
        onChange={(e) => save(e.target.value)}
        disabled={saving}
        className="flex-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs"
      >
        <option value="">— not attributed —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.title}</option>
        ))}
      </select>
      {saved && <Check className="size-3 text-green-600" />}
    </div>
  );
}
