import type { AssessmentParameters } from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import { CATEGORY_LABELS, getParameterDefinitions, type ParameterDefinition } from '@greenscore/shared';
import { Card, CardHeader } from '@greenscore/ui';

function formatValue(definition: ParameterDefinition, value: unknown): { text: string; empty: boolean } {
  if (value === undefined || value === null) return { text: 'Not provided', empty: true };
  switch (definition.kind) {
    case 'boolean':
      return { text: value === true ? 'Yes' : 'No', empty: false };
    case 'percent':
      return { text: `${value}%`, empty: false };
    case 'number':
      return { text: `${Number(value).toLocaleString('en-IN')} ${definition.unit ?? ''}`.trim(), empty: false };
    case 'level':
      return { text: String(value).charAt(0) + String(value).slice(1).toLowerCase(), empty: false };
  }
}

/** Everything the owner submitted, so the admin can check it against the evidence. */
export function ParametersCard({ parameters }: { parameters: AssessmentParameters | null }) {
  if (!parameters) return null;
  return (
    <Card padding="lg">
      <CardHeader title="Submitted parameters" description="As entered by the building owner. Compare with the documents." />
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {CATEGORY_KEYS.map((category) => {
          const values = (parameters[category] ?? {}) as Record<string, unknown>;
          return (
            <section key={category}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABELS[category]}</h4>
              <dl className="space-y-1.5 text-sm">
                {Object.entries(getParameterDefinitions(category)).map(([key, definition]) => {
                  const { text, empty } = formatValue(definition, values[key]);
                  return (
                    <div key={key} className="flex items-baseline justify-between gap-3">
                      <dt className="text-slate-600">{definition.label}</dt>
                      <dd className={empty ? 'text-slate-300' : 'font-medium tabular-nums text-ink'}>{text}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
