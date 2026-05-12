import { Construction } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
      <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
        <Construction className="size-8 text-stone-400 mx-auto mb-3" />
        <div className="text-sm text-stone-600">{description}</div>
        <div className="text-xs text-stone-400 mt-2">Coming in Phase 2/3 of the build.</div>
      </div>
    </div>
  );
}
