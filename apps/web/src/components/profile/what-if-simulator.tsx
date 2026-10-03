'use client';

import { useMemo, useState } from 'react';
import type { AssessmentParameters } from '@greenscore/types';
import { getImprovementOptions, projectImprovements } from '@greenscore/shared';
import { Badge, Button, Card, CardHeader, EmptyState, PROJECTION_COLOR, ScoreRing, cn } from '@greenscore/ui';

/**
 * "What if" simulator. The maths lives in @greenscore/shared (the same engine the API uses);
 * this component only lets the user pick improvements and shows the result as a PROJECTION.
 */
export function WhatIfSimulator({
  parameters,
  builtUpArea,
  occupants,
  currentScore,
}: {
  parameters: AssessmentParameters;
  builtUpArea: number;
  occupants: number;
  /** The score currently shown as the headline (verified if available, else preliminary). */
  currentScore: number;
}) {
  const context = useMemo(() => ({ builtUpArea, occupants }), [builtUpArea, occupants]);
  const options = useMemo(() => getImprovementOptions(parameters, context), [parameters, context]);
  const [selected, setSelected] = useState<string[]>([]);

  const { gain } = useMemo(() => projectImprovements(parameters, selected, context), [parameters, selected, context]);
  const projected = Math.min(100, Math.round((currentScore + gain) * 10) / 10);
  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <Card padding="lg">
      <CardHeader
        title="What-if simulator"
        description="Pick improvements to see how your score could change"
        action={
          <Badge tone="blue" dashed>
            Projection, not official
          </Badge>
        }
      />
      {options.length === 0 ? (
        <EmptyState icon="🏆" title="No further improvements to simulate" description="This building already maxes out every parameter we score." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {options.map((option) => {
              const on = selected.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(option.id)}
                    className={cn(
                      'flex h-full w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-600',
                      on ? 'border-ocean-400 bg-ocean-50' : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <span aria-hidden className="text-xl">
                      {option.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink">{option.title}</span>
                    <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold tabular-nums text-brand-700 ring-1 ring-brand-200">
                      +{option.scoreGain}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-center rounded-2xl bg-ocean-50/60 p-5 text-center ring-1 ring-ocean-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-ocean-800">Projected score</p>
            <div className="mt-3">
              <ScoreRing value={projected} size={132} strokeWidth={11} color={PROJECTION_COLOR} dashed />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Current <strong className="tabular-nums text-ink">{currentScore}</strong>
              {gain > 0 && (
                <>
                  {' → '}
                  <strong className="tabular-nums text-ocean-800">+{Math.round(gain * 10) / 10}</strong>
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {selected.length === 0
                ? 'Select improvements to project a new score.'
                : `${selected.length} improvement${selected.length > 1 ? 's' : ''} selected. This is an estimate, not an official score.`}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSelected(options.slice(0, 3).map((o) => o.id))}>
                Top 3
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={selected.length === 0}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
