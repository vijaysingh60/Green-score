'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MLFeedbackSummary } from '@greenscore/types';
import { Badge, Button, Card, CardHeader, EmptyState, LoadingState } from '@greenscore/ui';
import { api } from '@/lib/api';
import { useAdminQuery } from './use-admin-query';

const ML_COLOR = '#2582ea';
const HUMAN_COLOR = '#1f7f4d';

interface Row {
  name: string;
  ml: number;
  human: number;
}

function FeedbackTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-soft">
      <p className="mb-1 font-medium text-slate-500">{row.name}</p>
      <p className="flex items-center gap-2 font-semibold text-ink">
        <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: ML_COLOR }} />
        {row.ml} <span className="font-normal text-slate-500">ML</span>
      </p>
      <p className="flex items-center gap-2 font-semibold text-ink">
        <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: HUMAN_COLOR }} />
        {row.human} <span className="font-normal text-slate-500">Human verified</span>
      </p>
    </div>
  );
}

function FeedbackChart({ feedback }: { feedback: MLFeedbackSummary }) {
  const rows: Row[] = feedback.rows
    .slice(0, 10)
    .map((r) => ({ name: r.buildingName.replace(/^Sample /, ''), ml: r.mlScore, human: r.humanVerifiedScore }));
  return (
    <figure>
      <div className="mb-3 flex items-center gap-5 text-sm text-slate-600" aria-hidden>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-3.5 rounded-sm" style={{ backgroundColor: ML_COLOR }} /> ML prediction
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-3.5 rounded-sm" style={{ backgroundColor: HUMAN_COLOR }} /> Human verified
        </span>
      </div>
      <div className="w-full" style={{ height: rows.length * 44 + 24 }} role="img" aria-label="ML prediction versus human-verified score per building">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: rows.length * 44 + 24 }}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap={12} barGap={2}>
            <CartesianGrid horizontal={false} stroke="#e8eeea" strokeWidth={1} />
            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={170} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
            <Tooltip cursor={{ fill: 'rgba(15,42,30,0.04)' }} content={(props) => <FeedbackTooltip {...props} />} />
            <Bar dataKey="ml" fill={ML_COLOR} barSize={11} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="human" fill={HUMAN_COLOR} barSize={11} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function AdminModels() {
  const status = useAdminQuery((passcode) => api.admin.mlStatus(passcode));
  const feedback = useAdminQuery((passcode) => api.admin.mlFeedback(passcode));

  if (feedback.loading && !feedback.data) return <LoadingState message="Loading ML feedback…" />;
  if (feedback.error || !feedback.data) {
    return (
      <EmptyState icon="📡" title="Couldn’t load ML feedback" description={feedback.error ?? 'Unknown error'} action={<Button onClick={feedback.reload}>Try again</Button>} />
    );
  }

  const model = status.data?.reachable ? status.data.model : null;
  const { rows, mae, count } = feedback.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader
            title="ML service"
            description="Advisory predictions shown next to the rule-based score"
            action={
              status.data?.reachable ? (
                <Badge tone="green">● Online</Badge>
              ) : (
                <Badge tone="amber">Offline: simulated fallback</Badge>
              )
            }
          />
          {model ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <dt className="text-xs text-slate-500">Active model</dt>
                <dd className="mt-0.5 font-semibold text-ink">{model.activeVersion ?? '—'}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <dt className="text-xs text-slate-500">MAE</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{model.metrics?.mae ?? '—'}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <dt className="text-xs text-slate-500">RMSE</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{model.metrics?.rmse ?? '—'}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <dt className="text-xs text-slate-500">R²</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{model.metrics?.r2 ?? '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
              The Python ML service isn’t reachable, so new submissions get a clearly-labelled simulated prediction.
              Start it with <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200">npm run dev:ml</code>.
            </p>
          )}
          {model?.message && <p className="mt-3 text-xs text-slate-500">{model.message}</p>}
          <p className="mt-2 text-xs text-slate-500">
            Retraining is not automatic in this MVP: feedback is only stored. The model never decides a final score.
          </p>
        </Card>

        <Card padding="lg">
          <CardHeader title="Feedback" description="ML prediction vs human-verified score" />
          <p className="text-5xl font-semibold tracking-tight text-ink">{mae !== null ? `±${mae}` : '—'}</p>
          <p className="mt-1 text-sm text-slate-500">mean absolute error over {count} verified building(s)</p>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader title="ML vs human" description="Only human-verified scores count as ground truth" />
        {rows.length === 0 ? (
          <EmptyState icon="🧪" title="No feedback yet" description="Verify a building and the ML-vs-human comparison is stored here." />
        ) : (
          <FeedbackChart feedback={feedback.data} />
        )}
      </Card>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Building</th>
                <th className="px-3 py-3 text-right font-medium">ML</th>
                <th className="px-3 py-3 text-right font-medium">Human</th>
                <th className="px-3 py-3 text-right font-medium">Difference</th>
                <th className="px-5 py-3 font-medium">Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3">
                    <span className="font-medium text-ink">{row.buildingName}</span>
                    {row.isDemo && (
                      <Badge tone="amber" dashed className="ml-2">
                        Demo
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.mlScore}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{row.humanVerifiedScore}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.absoluteError}</td>
                  <td className="px-5 py-3 text-slate-500">{row.modelVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
