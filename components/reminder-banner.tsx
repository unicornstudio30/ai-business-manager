"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

// Slim banner shown ONLY:
//   - After 4pm local time
//   - When today's CRM has no inferred activity yet
//   - When the user hasn't dismissed it this session
// Polls /api/streak once on mount + every 5 minutes.
export function ReminderBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    async function check() {
      const now = new Date();
      // Only nudge after 4pm local time
      if (now.getHours() < 16) {
        setShow(false);
        return;
      }
      try {
        const r = await fetch("/api/streak");
        const json = await r.json();
        if (!json.todayLogged) setShow(true);
      } catch { /* ignore */ }
    }

    check();
    const handle = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(handle);
  }, [dismissed]);

  if (!show || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center gap-3">
      <AlertCircle className="size-3.5 text-amber-700 flex-shrink-0" />
      <span className="flex-1">
        <strong>Streak at risk.</strong> No CRM activity logged today yet. Update a contact in Notion or click Sync to refresh.
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-700 hover:text-amber-900" aria-label="Dismiss">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
