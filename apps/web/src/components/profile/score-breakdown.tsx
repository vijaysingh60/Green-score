import type { ScoreBreakdown as Breakdown } from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import { CATEGORY_LABELS, SCORING_CONFIG } from '@greenscore/shared';
import { Badge, Card, CardHeader, ProgressBar } from '@greenscore/ui';

const ICONS: Record<(typeof CATEGORY_KEYS)[number], string> = {
  energy: '⚡',
  water: '💧',
  waste: '♻️',
  greenCover: '🌳',
  materials: '🧱',
  indoorEnvironment: '🌤️',
  mobility: '🚲',
  climateResilience: '🌡️',
};

/** Points per category as one-hue bars. The two weakest categories are flagged as opportunities. */
export function ScoreBreakdown({
  breakdown,
  title,
  description,
}: {
  breakdown: Breakdown;
  title: string;
  description?: string;
}) {
  const fractions = CATEGORY_KEYS.map((key) => ({
    key,
    fraction: breakdown[key] / SCORING_CONFIG.categories[key].maxPoints,
  })).sort((a, b) => a.fraction - b.fraction);
  const weakest = new Set(fractions.slice(0, 2).filter((f) => f.fraction < 0.6).map((f) => f.key));

  return (
    <Card padding="lg">
      <CardHeader title={title} description={description} />
      <ul className="space-y-4">
        {CATEGORY_KEYS.map((key) => (
          <li key={key}>
            <ProgressBar
              value={breakdown[key]}
              max={SCORING_CONFIG.categories[key].maxPoints}
              showValue
              label={
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden>{ICONS[key]}</span>
                  {CATEGORY_LABELS[key]}
                  {weakest.has(key) && <Badge tone="amber">Opportunity</Badge>}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
