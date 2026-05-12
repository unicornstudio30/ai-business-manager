import { STAGES, STAGE_COLORS, type Stage } from "@/lib/stages";

export function StageStepper({ status }: { status: string | null }) {
  if (!status) return null;
  const currentIdx = STAGES.indexOf(status as Stage);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Current stage</div>
      <span
        className={`inline-flex w-fit items-center rounded-md border px-3 py-1 text-sm font-medium ${
          STAGE_COLORS[status as Stage] ?? "bg-stone-100 text-stone-800 border-stone-200"
        }`}
      >
        {status}
      </span>
      <div className="text-xs text-stone-500">
        Step {currentIdx + 1} of {STAGES.length}
      </div>
    </div>
  );
}
