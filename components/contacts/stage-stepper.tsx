import { stageColor } from "@/lib/stages";

// `stages` = Notion's stage list (getStages()), used only for "Step N of M".
export function StageStepper({ status, stages }: { status: string | null; stages: string[] }) {
  if (!status) return null;
  const currentIdx = stages.indexOf(status);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Current stage</div>
      <span
        className={`inline-flex w-fit items-center rounded-md border px-3 py-1 text-sm font-medium ${
          stageColor(status)
        }`}
      >
        {status}
      </span>
      {currentIdx >= 0 && (
        <div className="text-xs text-stone-500">
          Step {currentIdx + 1} of {stages.length}
        </div>
      )}
    </div>
  );
}
