import { Badge, Card } from '@greenscore/ui';
import { SCORING_CONFIG, TOTAL_POINTS } from '@greenscore/shared';
import { FrameworkChart } from './framework-chart';

const KINDS = [
  {
    icon: '⚡',
    title: 'Preliminary score',
    text: 'Calculated instantly from the parameters you submit, using transparent rules.',
    badge: <Badge tone="amber">Pending human verification</Badge>,
  },
  {
    icon: '🤖',
    title: 'ML predicted score',
    text: 'A second opinion from a machine-learning model. Always advisory, never final.',
    badge: (
      <Badge tone="blue" dashed>
        Advisory, not final
      </Badge>
    ),
  },
  {
    icon: '🔮',
    title: 'Projected score',
    text: 'A what-if estimate: see how solar, rainwater harvesting or EV charging would change your score.',
    badge: (
      <Badge tone="blue" dashed>
        Projection
      </Badge>
    ),
  },
  {
    icon: '✅',
    title: 'Verified Green Score',
    text: 'The official score, published only after a person has reviewed the evidence.',
    badge: <Badge tone="green">✓ Verified</Badge>,
  },
];

export function ScoreKinds() {
  return (
    <section className="border-t border-slate-200/60 bg-white/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Four scores, never mixed up</h2>
          <p className="mt-2 max-w-lg text-slate-600">
            Every building can show up to four different scores. They are stored and labelled separately, so an
            automatic estimate is never mistaken for a verified result.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {KINDS.map((kind) => (
              <Card key={kind.title} padding="md">
                <div className="flex items-center justify-between gap-2">
                  <span aria-hidden className="text-2xl">
                    {kind.icon}
                  </span>
                  {kind.badge}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">{kind.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{kind.text}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card padding="lg">
          <h3 className="text-base font-semibold text-ink">The {TOTAL_POINTS}-point framework</h3>
          <p className="mt-0.5 text-sm text-slate-500">Points available in each sustainability category</p>
          <div className="mt-4">
            <FrameworkChart />
          </div>
          <p className="mt-2 border-t border-slate-100 pt-3 text-xs text-slate-500">{SCORING_CONFIG.disclaimer}</p>
        </Card>
      </div>
    </section>
  );
}
