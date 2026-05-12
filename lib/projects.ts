// Project status enum + service line enum + dashboard groupings.
// Mirrors Unicorn Studio's 5-8 week build lifecycle.

export const PROJECT_STATUSES = [
  "Briefing",      // scope being finalized
  "Building",      // active build
  "QA",            // testing / review
  "Delivered",     // shipped to client
  "Maintenance",   // ongoing support post-launch
  "Closed",        // engagement ended
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const SERVICE_LINES = [
  "AI Systems",
  "AI Integrations",
  "AI Solutions",
  "AI SaaS",
  "Website",
  "Branding",
] as const;

export type ServiceLine = (typeof SERVICE_LINES)[number];

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  "Briefing": "bg-stone-100 text-stone-700 border-stone-200",
  "Building": "bg-blue-100 text-blue-800 border-blue-200",
  "QA": "bg-amber-100 text-amber-800 border-amber-200",
  "Delivered": "bg-green-100 text-green-800 border-green-200",
  "Maintenance": "bg-violet-100 text-violet-800 border-violet-200",
  "Closed": "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export const SERVICE_LINE_COLORS: Record<ServiceLine, string> = {
  "AI Systems":      "bg-purple-100 text-purple-800",
  "AI Integrations": "bg-blue-100 text-blue-800",
  "AI Solutions":    "bg-indigo-100 text-indigo-800",
  "AI SaaS":         "bg-fuchsia-100 text-fuchsia-800",
  "Website":         "bg-emerald-100 text-emerald-800",
  "Branding":        "bg-rose-100 text-rose-800",
};

// Active = not closed. Used for "at risk" + analytics.
export function isActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return status !== "Closed";
}
