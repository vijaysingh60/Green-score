import type { Recommendation } from '@greenscore/types';
import { Badge, Card, CardHeader, EmptyState } from '@greenscore/ui';

const PRIORITY_TONE = { HIGH: 'red', MEDIUM: 'amber', LOW: 'neutral' } as const;

export function RecommendationsCard({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Recommendations"
        description="Highest-impact improvements for your weakest areas"
        action={<Badge tone="neutral">Rule-based</Badge>}
      />
      {recommendations.length === 0 ? (
        <EmptyState icon="🎉" title="Nothing obvious to improve" description="This building already scores well in every area we check." />
      ) : (
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li key={rec.id} className="flex gap-3.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-slate-100">
                {rec.icon ?? '🌱'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink">{rec.title}</h4>
                  <Badge tone="green">+{rec.potentialImpact.scoreGain} pts</Badge>
                  <Badge tone={PRIORITY_TONE[rec.priority]}>{rec.priority.toLowerCase()} priority</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{rec.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
