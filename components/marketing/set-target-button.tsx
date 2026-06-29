"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Check, X } from "lucide-react";

export function SetTargetButton({
  userId,
  weekStart,
  currentTarget,
  userName,
}: {
  userId: string;
  weekStart: string;
  currentTarget: number;
  userName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentTarget));
  const [pending, startTransition] = useTransition();

  function save() {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    startTransition(async () => {
      const res = await fetch("/api/marketing/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, weekStart, targetPoints: n }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-stone-400 hover:text-stone-700 inline-flex items-center justify-center w-7 h-7 rounded hover:bg-stone-100"
        aria-label={`Edit target for ${userName}`}
      >
        <Pencil className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="w-20 rounded border border-stone-300 px-2 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="text-green-700 hover:bg-green-50 inline-flex items-center justify-center w-6 h-6 rounded"
        aria-label="Save target"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setValue(String(currentTarget));
        }}
        className="text-stone-400 hover:bg-stone-100 inline-flex items-center justify-center w-6 h-6 rounded"
        aria-label="Cancel"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
