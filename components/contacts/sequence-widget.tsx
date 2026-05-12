import { getSequence, nextStep, trackForPlatform } from "@/lib/sequences";
import { Calendar } from "lucide-react";

export function SequenceWidget({
  platform,
  engageTouch,
  lastTouchAt,
}: {
  platform: string | null;
  engageTouch: number | null;
  lastTouchAt: Date | null;
}) {
  const track = trackForPlatform(platform);
  const seq = getSequence(track);
  const current = engageTouch ?? 0;
  const { next, isFinal } = nextStep(track, current);
  const daysSince = lastTouchAt
    ? Math.floor((Date.now() - lastTouchAt.getTime()) / 86400000)
    : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-stone-900">DM sequence</div>
        <span className="text-xs text-stone-500 capitalize">{track} track</span>
      </div>
      <div className="text-xs text-stone-600 mb-3">
        At step <span className="font-medium">{current}</span> / {seq.length}
        {daysSince !== null && <> · last touch {daysSince}d ago</>}
      </div>
      {next ? (
        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
            Next: step {next.step}
          </div>
          <div className="text-sm font-medium text-stone-900">{next.brief}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <Calendar className="size-3" /> Day +{next.dayOffsetFromPrev} from last touch · {next.channel}
          </div>
          <div className="mt-3 text-xs text-stone-500 italic">
            Run <code className="px-1.5 py-0.5 bg-stone-100 rounded">/next-message {`<contact-id>`}</code> in Claude Code to draft.
          </div>
        </div>
      ) : (
        <div className="text-sm text-stone-500">
          {isFinal ? "Sequence complete — move to long-term nurture." : "No next step defined."}
        </div>
      )}
    </div>
  );
}
