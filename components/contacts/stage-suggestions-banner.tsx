import { Lightbulb, ArrowRight, ExternalLink } from "lucide-react";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import type { StageSuggestion } from "@/lib/stage-suggestions";

const CONFIDENCE_COLORS = {
  high: "border-emerald-300 bg-emerald-50",
  medium: "border-amber-300 bg-amber-50",
  low: "border-stone-300 bg-stone-50",
};

export function StageSuggestionsBanner({
  currentStage,
  suggestions,
  notionPageId,
}: {
  currentStage: string | null;
  suggestions: StageSuggestion[];
  notionPageId: string | null;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((s, i) => (
        <div key={i} className={`rounded-xl border p-4 ${CONFIDENCE_COLORS[s.confidence]}`}>
          <div className="flex items-start gap-3">
            <Lightbulb className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-900 mb-1">
                Suggested stage move
                {currentStage && (
                  <>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[currentStage as Stage]}`}>
                      {currentStage}
                    </span>
                    <ArrowRight className="size-3.5 text-stone-400" />
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${STAGE_COLORS[s.toStage as Stage]}`}>
                      {s.toStage}
                    </span>
                  </>
                )}
                <span className="text-[10px] uppercase tracking-wide text-stone-500 ml-auto">
                  {s.confidence}
                </span>
              </div>
              <p className="text-sm text-stone-700">{s.reason}</p>
              {notionPageId && (
                <a
                  href={`https://www.notion.so/${notionPageId.replace(/-/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  Update stage in Notion <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
