'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScoreHistoryPoint } from '@greenscore/types';
import { Badge, Card, CardHeader } from '@greenscore/ui';

interface Row {
  label: string;
  score: number;
  note: string;
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-soft">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <span className="h-0.5 w-3 rounded bg-brand-600" />
        {row.score} / 100
      </p>
      <p className="text-slate-500">
        {row.label} · {row.note}
      </p>
    </div>
  );
}

/** One-series line over time: no legend box (the title says what it is), tooltip on hover. */
export function ScoreHistoryChart({ history }: { history: ScoreHistoryPoint[] }) {
  const simulated = history.some((p) => p.kind === 'simulated');
  const data: Row[] = history.map((p) => ({ label: dateLabel(p.date), score: p.score, note: p.label }));

  return (
    <Card padding="lg">
      <CardHeader
        title="Score history"
        description={simulated ? 'Simulated for the demo' : 'Recorded score events'}
        action={
          simulated ? (
            <Badge tone="amber" dashed>
              Simulated
            </Badge>
          ) : undefined
        }
      />
      {data.length < 2 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          History builds up as this building is verified and re-assessed.
          {data[0] && (
            <>
              {' '}
              So far: <strong className="text-ink">{data[0].score}</strong> ({data[0].note}).
            </>
          )}
        </p>
      ) : (
        <figure>
          <div className="h-[220px] w-full" role="img" aria-label="Green score over time">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 220 }}>
              <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke="#e8eeea" strokeWidth={1} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} content={(props) => <HistoryTooltip {...props} />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#1f7f4d"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#1f7f4d"
                  fillOpacity={0.1}
                  dot={{ r: 4, fill: '#1f7f4d', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#1f7f4d', stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="sr-only">
            <table>
              <caption>Score history</caption>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <th scope="row">{row.label}</th>
                    <td>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figcaption>
        </figure>
      )}
    </Card>
  );
}
