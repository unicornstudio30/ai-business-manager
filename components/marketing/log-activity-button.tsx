"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LogActivityModal } from "./log-activity-modal";

export function LogActivityButton({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 min-h-[40px]"
      >
        <Plus className="size-4" /> Log activity
      </button>
      <LogActivityModal open={open} onClose={() => setOpen(false)} weekStart={weekStart} />
    </>
  );
}
