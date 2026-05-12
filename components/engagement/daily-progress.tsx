type Props = {
  counts: {
    comments: number;
    dms: number;
    follow_ups: number;
    emails: number;
    posts_observed: number;
  };
  targets: {
    cold_dms_sent: number;
    follow_ups_sent: number;
    comments_on_prospects: number;
  };
};

function ProgressTile({
  label,
  count,
  target,
  emoji,
}: { label: string; count: number; target: number; emoji: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
  const tone = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-stone-300";
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium text-stone-600 uppercase tracking-wide">
          {emoji} {label}
        </span>
        <span className="text-sm font-semibold text-stone-900 tabular-nums">
          {count}/{target}
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DailyProgress({ counts, targets }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ProgressTile
        label="Comments"
        count={counts.comments}
        target={targets.comments_on_prospects}
        emoji="💬"
      />
      <ProgressTile
        label="DMs"
        count={counts.dms}
        target={targets.cold_dms_sent}
        emoji="📨"
      />
      <ProgressTile
        label="Follow-ups"
        count={counts.follow_ups}
        target={targets.follow_ups_sent}
        emoji="↩️"
      />
      <ProgressTile
        label="Posts scanned"
        count={counts.posts_observed}
        target={0}
        emoji="👁"
      />
    </div>
  );
}
