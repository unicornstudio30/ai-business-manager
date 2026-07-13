"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LogSalesActivityModal } from "./log-activity-modal";

export function LogSalesActivityButton({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 min-h-[40px]"
      >
        <Plus className="size-4" /> Log sale
      </button>
      <LogSalesActivityModal open={open} onClose={() => setOpen(false)} weekStart={weekStart} />
    </>
  );
}
