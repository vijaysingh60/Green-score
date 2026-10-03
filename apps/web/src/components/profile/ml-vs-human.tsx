import type { MLFeedback } from '@greenscore/types';
import { Badge, Card, CardHeader } from '@greenscore/ui';

const BAR_ML = '#2582ea';
const BAR_HUMAN = '#1f7f4d';

/** ML prediction next to the human-verified score. The difference is stored as ML feedback. */
export function MlVsHuman({ feedback }: { feedback: MLFeedback }) {
  const diff = Math.round((feedback.humanVerifiedScore - feedback.mlScore) * 10) / 10;
  const rows = [
    { label: 'ML prediction', value: feedback.mlScore, color: BAR_ML },
    { label: 'Human verified', value: feedback.humanVerifiedScore, color: BAR_HUMAN },
  ];

  return (
    <Card padding="lg">
      <CardHeader
        title="ML vs human"
        description={`Model ${feedback.modelVersion}`}
        action={<Badge tone="neutral">Feedback stored</Badge>}
      />
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
                {row.label}
              </span>
              <span className="font-semibold tabular-nums text-ink">{row.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${row.value}%`, backgroundColor: row.color }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-600">Difference</span>
        <span className="text-lg font-semibold tabular-nums text-ink">
          {feedback.absoluteError}
          <span className="ml-1.5 text-xs font-normal text-slate-500">
            ({diff > 0 ? 'human higher' : diff < 0 ? 'ML higher' : 'identical'})
          </span>
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Only the human-verified score counts as ground truth. The model never retrains automatically.
      </p>
    </Card>
  );
}
